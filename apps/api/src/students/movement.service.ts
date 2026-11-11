import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { StudentRepository } from "./student.repository.js";
import { MovementRepository, type CreateMovement } from "./movement.repository.js";

@Injectable()
export class MovementService {
  constructor(
    @Inject(MovementRepository) private readonly repository: MovementRepository,
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal, sessionId?: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    return this.repository.list(schoolId, sessionId);
  }

  async decide(principal: AuthenticatedPrincipal, requestId: string, studentId: string, input: Omit<CreateMovement, "schoolId" | "studentId" | "decidedByUserId">) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentMove);
    const student = await this.students.findById(schoolId, studentId);
    if (!student) throw new NotFoundException("Student not found");
    if (input.decision === "promote" && (!input.toClassId || !input.toArmId)) {
      throw new ConflictException("Promotion requires a target class and arm");
    }
    if (input.decision !== "promote" && (input.toClassId || input.toArmId)) {
      throw new ConflictException("Only promotion may specify a target class and arm");
    }
    const existing = await this.repository.find(schoolId, studentId, input.sessionId);
    if (existing) throw new ConflictException("A movement decision already exists for this student and session");
    const movement = await this.repository.create({
      ...input,
      schoolId,
      studentId,
      fromClassId: student.classId ?? undefined,
      fromArmId: student.armId ?? undefined,
      decidedByUserId: principal.userId,
    });
    const updated = input.decision === "promote"
      ? await this.students.update(schoolId, studentId, { classId: input.toClassId, armId: input.toArmId, status: "approved", updatedByUserId: principal.userId })
      : input.decision === "graduate"
        ? await this.students.update(schoolId, studentId, { status: "graduated", updatedByUserId: principal.userId })
        : await this.students.update(schoolId, studentId, { status: "approved", updatedByUserId: principal.userId });
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: `student.${input.decision}`,
      objectType: "student_movement",
      objectId: movement.id,
      outcome: "allowed",
      requestId,
      before: student,
      after: { movement, student: updated },
    });
    return { movement, student: updated };
  }
}
