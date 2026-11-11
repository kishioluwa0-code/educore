import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { StudentRepository, type CreateStudentRecord } from "./student.repository.js";
import type { UpdateStudentRecord } from "./student.repository.js";
import { StudentDocumentRepository } from "./student-document.repository.js";

@Injectable()
export class StudentService {
  constructor(
    @Inject(StudentRepository) private readonly repository: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(StudentDocumentRepository) private readonly documents: StudentDocumentRepository,
  ) {}

  private schoolId(principal: AuthenticatedPrincipal): string {
    if (!principal.activeSchoolId) throw new NotFoundException("No active school is selected");
    return principal.activeSchoolId;
  }

  async list(principal: AuthenticatedPrincipal) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    return this.isSchoolWide(principal) ? this.repository.listBySchool(schoolId) : this.repository.listByTeacherScope(schoolId, principal.userId);
  }

  async find(principal: AuthenticatedPrincipal, studentId: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    const student = this.isSchoolWide(principal) ? await this.repository.findById(schoolId, studentId) : await this.repository.findByTeacherScope(schoolId, principal.userId, studentId);
    if (!student) throw new NotFoundException("Student not found");
    return student;
  }

  private isSchoolWide(principal: AuthenticatedPrincipal) {
    const membership = principal.memberships.find((item) => item.schoolId === principal.activeSchoolId && item.status === "active");
    return membership?.roleKeys.some((role) => role === "administrator" || role === "school_administrator" || role === "principal") ?? false;
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: Omit<CreateStudentRecord, "schoolId" | "createdByUserId">) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);

    try {
      const student = await this.repository.create({
        ...input,
        schoolId,
        createdByUserId: principal.userId,
      });
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "student.create",
        objectType: "student",
        objectId: student.id,
        outcome: "allowed",
        requestId,
        after: student,
      });
      return student;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("Admission number already exists in this school");
      }
      throw error;
    }
  }

  async update(
    principal: AuthenticatedPrincipal,
    requestId: string,
    studentId: string,
    input: Omit<UpdateStudentRecord, "updatedByUserId" | "status" | "admittedAt" | "withdrawnAt">,
  ) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    const before = await this.find(principal, studentId);
    const student = await this.repository.update(schoolId, studentId, {
      ...input,
      updatedByUserId: principal.userId,
    });
    if (!student) throw new NotFoundException("Student not found");
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.update",
      objectType: "student",
      objectId: student.id,
      outcome: "allowed",
      requestId,
      before,
      after: student,
    });
    return student;
  }

  async approve(principal: AuthenticatedPrincipal, requestId: string, studentId: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentApprove);
    const before = await this.find(principal, studentId);
    if (before.status !== "pending") throw new ConflictException("Only pending students can be approved");
    if (!(await this.documents.hasVerifiedRequirements(schoolId, studentId))) {
      throw new ConflictException("Required admission documents must be verified before approval");
    }
    const student = await this.repository.update(schoolId, studentId, {
      status: "approved",
      admittedAt: new Date(),
      updatedByUserId: principal.userId,
    });
    if (!student) throw new NotFoundException("Student not found");
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.approve",
      objectType: "student",
      objectId: student.id,
      outcome: "allowed",
      requestId,
      before,
      after: student,
    });
    return student;
  }

  async transfer(
    principal: AuthenticatedPrincipal,
    requestId: string,
    studentId: string,
    classId: string,
    armId: string,
    effectiveDate: Date,
    reason: string,
  ) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    if (!reason.trim()) throw new ConflictException("A transfer reason is required");
    const before = await this.find(principal, studentId);
    const student = await this.repository.update(schoolId, studentId, {
      classId,
      armId,
      status: "transferred",
      updatedByUserId: principal.userId,
    });
    if (!student) throw new NotFoundException("Student not found");
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.transfer",
      objectType: "student",
      objectId: student.id,
      outcome: "allowed",
      reason: `${effectiveDate.toISOString()}: ${reason.trim()}`,
      requestId,
      before,
      after: student,
    });
    return student;
  }

  async withdraw(
    principal: AuthenticatedPrincipal,
    requestId: string,
    studentId: string,
    effectiveDate: Date,
    reason: string,
  ) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    if (!reason.trim()) throw new ConflictException("A withdrawal reason is required");
    const before = await this.find(principal, studentId);
    const student = await this.repository.update(schoolId, studentId, {
      status: "withdrawn",
      withdrawnAt: effectiveDate,
      updatedByUserId: principal.userId,
    });
    if (!student) throw new NotFoundException("Student not found");
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.withdraw",
      objectType: "student",
      objectId: student.id,
      outcome: "allowed",
      reason: reason.trim(),
      requestId,
      before,
      after: student,
    });
    return student;
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current !== "object") return false;
    const candidate = current as { code?: unknown; message?: unknown; cause?: unknown };
    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
    if (
      candidate.code === "23505" ||
      message.includes("duplicate key") ||
      message.includes("unique constraint")
    ) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}