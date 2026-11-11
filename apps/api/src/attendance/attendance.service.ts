import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { StudentRepository } from "../students/student.repository.js";
import { AcademicRepository } from "../academics/academic.repository.js";
import { AttendanceRepository, type AttendanceInput } from "./attendance.repository.js";
import { createHash } from "node:crypto";

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(AttendanceRepository) private readonly repository: AttendanceRepository,
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AcademicRepository) private readonly academics: AcademicRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal, filters: { classId?: string; armId?: string; sessionId?: string; termId?: string; date?: Date }) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceRead);
    const records = await this.repository.list(schoolId, filters);
    if (this.isSchoolWide(principal)) return records;
    const scope = await this.academics.resolveTeacherScope(schoolId, principal.userId, filters.sessionId, filters.termId);
    const allowed = new Set([...scope.classAssignments, ...scope.subjectAssignments].map((assignment) => `${assignment.classId}:${assignment.armId ?? "*"}`));
    return records.filter((record) => allowed.has(`${record.classId}:${record.armId}`) || allowed.has(`${record.classId}:*`));
  }

  async find(principal: AuthenticatedPrincipal, id: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceRead);
    const record = await this.repository.find(schoolId, id);
    if (!record) throw new NotFoundException("Attendance record not found");
    if (!(await this.canAccessRecord(principal, record))) throw new NotFoundException("Attendance record not found");
    return record;
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: AttendanceInput, idempotencyKey?: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceWrite);
    await this.assertTeacherScope(principal, input);
    if (!input.entries.length) throw new ConflictException("Attendance must include at least one student");
    for (const entry of input.entries) {
      const student = await this.students.findById(schoolId, entry.studentId);
      if (!student || student.classId !== input.classId || student.armId !== input.armId) throw new ConflictException("Every attendance student must belong to the selected class and arm");
    }

    const requestFingerprint = createHash("sha256").update(JSON.stringify(input)).digest("hex");
    const result = await this.repository.create(schoolId, input, principal.userId, idempotencyKey, requestFingerprint);
    if (result.created) await this.audit.record({ schoolId, actorUserId: principal.userId, action: "attendance.create", objectType: "attendance_record", objectId: result.record.id, outcome: "allowed", requestId, after: result.record as unknown as Record<string, unknown> });
    return result.record;
  }

  async sync(principal: AuthenticatedPrincipal, requestId: string, operations: Array<{ operationId: string; input: AttendanceInput }>) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceWrite);
    const results: Array<{ operationId: string; status: string; attendanceRecordId?: string; conflictReason?: string }> = [];
    for (const operation of operations) {
      const fingerprint = createHash("sha256").update(JSON.stringify(operation.input)).digest("hex");
      const stored = await this.repository.recordSyncOperation(schoolId, operation.operationId, operation.input, fingerprint, principal.userId);
      if (stored.status === "applied" || stored.status === "conflict") {
        results.push({ operationId: operation.operationId, status: stored.status, attendanceRecordId: stored.attendanceRecordId ?? undefined, conflictReason: stored.conflictReason ?? undefined });
        continue;
      }
      try {
        const record = await this.create(principal, requestId, operation.input, `sync:${operation.operationId}`);
        const reconciled = await this.repository.reconcileSyncOperation(schoolId, operation.operationId, "applied", record.id);
        results.push({ operationId: operation.operationId, status: reconciled.status, attendanceRecordId: record.id });
      } catch (error) {
        if (!(error instanceof ConflictException)) throw error;
        const reconciled = await this.repository.reconcileSyncOperation(schoolId, operation.operationId, "conflict", undefined, error.message);
        results.push({ operationId: operation.operationId, status: reconciled.status, conflictReason: reconciled.conflictReason ?? undefined });
      }
    }
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "attendance.sync", objectType: "attendance_sync_batch", objectId: requestId, outcome: "allowed", requestId, after: { count: results.length, applied: results.filter((result) => result.status === "applied").length, conflicts: results.filter((result) => result.status === "conflict").length } });
    return { results };
  }

  async syncStatus(principal: AuthenticatedPrincipal, status?: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceRead);
    return this.repository.listSyncOperations(schoolId, status);
  }

  async transition(principal: AuthenticatedPrincipal, requestId: string, id: string, next: "submitted" | "returned" | "approved", reason?: string) {
    const schoolId = this.schoolId(principal);
    const current = await this.repository.find(schoolId, id);
    if (!current) throw new NotFoundException("Attendance record not found");
    if (!(await this.canAccessRecord(principal, current))) throw new NotFoundException("Attendance record not found");
    if (next === "submitted") this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceWrite);
    else this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceApprove);
    const allowed: Record<string, string[]> = { submitted: ["draft", "returned"], returned: ["submitted"], approved: ["submitted"] };
    if (!allowed[next]!.includes(current.status)) throw new ConflictException(`Attendance record cannot move from ${current.status} to ${next}`);
    if (next === "returned" && !reason?.trim()) throw new ConflictException("A return reason is required");
    const record = await this.repository.transition(schoolId, id, next, principal.userId, reason?.trim());
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: `attendance.${next}`, objectType: "attendance_record", objectId: id, outcome: "allowed", requestId, reason: reason?.trim(), before: current as unknown as Record<string, unknown>, after: record as unknown as Record<string, unknown> });
    return record;
  }

  async listExceptions(principal: AuthenticatedPrincipal, status?: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceRead);
    return this.repository.listExceptions(schoolId, status);
  }

  async createException(principal: AuthenticatedPrincipal, requestId: string, input: { attendanceRecordId: string; studentId: string; kind: "absence" | "lateness"; note?: string; ownerUserId?: string }) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceWrite);
    const record = await this.repository.find(schoolId, input.attendanceRecordId);
    if (!record || !(await this.canAccessRecord(principal, record))) throw new NotFoundException("Attendance record not found");
    const student = await this.students.findById(schoolId, input.studentId);
    if (!student || student.classId !== record.classId || student.armId !== record.armId) throw new ConflictException("The exception student is not in the attendance register");
    const exception = await this.repository.createException(schoolId, input);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "attendance.exception.create", objectType: "attendance_exception", objectId: exception.id, outcome: "allowed", requestId, after: exception as unknown as Record<string, unknown> });
    return exception;
  }

  async transitionException(principal: AuthenticatedPrincipal, requestId: string, id: string, status: "contacted" | "resolved", note?: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.attendanceApprove);
    const exception = await this.repository.transitionException(schoolId, id, status, note);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: `attendance.exception.${status}`, objectType: "attendance_exception", objectId: id, outcome: "allowed", requestId, after: exception as unknown as Record<string, unknown> });
    return exception;
  }

  private async assertTeacherScope(principal: AuthenticatedPrincipal, input: AttendanceInput) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    const schoolWide = membership.roleKeys.some((role) => ["administrator", "school_administrator", "principal"].includes(role));
    if (schoolWide) return;
    const scope = await this.academics.resolveTeacherScope(membership.schoolId, principal.userId, input.sessionId, input.termId);
    const allowed = [...scope.classAssignments, ...scope.subjectAssignments].some((assignment) => assignment.classId === input.classId && (!assignment.armId || assignment.armId === input.armId));
    if (!allowed) throw new ConflictException("You are not assigned to this class and arm");
  }

  private isSchoolWide(principal: AuthenticatedPrincipal) {
    const membership = principal.memberships.find((item) => item.schoolId === principal.activeSchoolId && item.status === "active");
    return membership?.roleKeys.some((role) => ["administrator", "school_administrator", "principal"].includes(role)) ?? false;
  }

  private async canAccessRecord(principal: AuthenticatedPrincipal, record: { classId: string; armId: string; sessionId: string; termId: string }) {
    if (this.isSchoolWide(principal)) return true;
    const scope = await this.academics.resolveTeacherScope(principal.activeSchoolId!, principal.userId, record.sessionId, record.termId);
    return [...scope.classAssignments, ...scope.subjectAssignments].some((assignment) => assignment.classId === record.classId && (!assignment.armId || assignment.armId === record.armId));
  }

  private schoolId(principal: AuthenticatedPrincipal) {
    if (!principal.activeSchoolId) throw new NotFoundException("No active school is selected");
    return principal.activeSchoolId;
  }
}
