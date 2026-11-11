import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { AttemptRepository, type AnswerMap, type AttemptEventType, type EventMetadata } from "./attempt.repository.js";
import { StudentRepository } from "../students/student.repository.js";

@Injectable()
export class AttemptService {
  constructor(
    @Inject(AttemptRepository) private readonly repository: AttemptRepository,
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtAttemptWrite);
    return schoolId;
  }

  private async studentId(principal: AuthenticatedPrincipal, schoolId: string) {
    const student = await this.students.findByUserId(schoolId, principal.userId);
    if (!student) throw new ConflictException("Authenticated user is not a linked student");
    return student.id;
  }

  async start(principal: AuthenticatedPrincipal, requestId: string, configurationId: string) {
    const schoolId = this.school(principal);
    const studentId = await this.studentId(principal, schoolId);
    const attempt = await this.repository.start(schoolId, configurationId, studentId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-attempt.start", objectType: "cbt_attempt", objectId: attempt.id, outcome: "allowed", requestId, after: attempt as unknown as Record<string, unknown> });
    return attempt;
  }

  async get(principal: AuthenticatedPrincipal, attemptId: string) {
    const schoolId = this.school(principal);
    return this.repository.find(schoolId, attemptId, await this.studentId(principal, schoolId));
  }

  async autosave(principal: AuthenticatedPrincipal, requestId: string, attemptId: string, operationId: string, sequence: number, answers: AnswerMap) {
    const schoolId = this.school(principal);
    const result = await this.repository.autosave(schoolId, attemptId, await this.studentId(principal, schoolId), operationId, sequence, answers);
    if (result.accepted) await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-attempt.autosave", objectType: "cbt_attempt", objectId: attemptId, outcome: "allowed", requestId, after: { sequence } });
    return result.attempt;
  }

  async submit(principal: AuthenticatedPrincipal, requestId: string, attemptId: string) {
    const schoolId = this.school(principal);
    const attempt = await this.repository.submit(schoolId, attemptId, await this.studentId(principal, schoolId));
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-attempt.submit", objectType: "cbt_attempt", objectId: attemptId, outcome: "allowed", requestId, after: attempt as unknown as Record<string, unknown> });
    return attempt;
  }

  async reset(principal: AuthenticatedPrincipal, requestId: string, attemptId: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtIncidentReset);
    const attempt = await this.repository.reset(schoolId, attemptId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-attempt.reset", objectType: "cbt_attempt", objectId: attemptId, outcome: "allowed", requestId, after: { status: attempt.status } });
    return attempt;
  }

  async recordEvent(principal: AuthenticatedPrincipal, requestId: string, attemptId: string, operationId: string, sequence: number, eventType: AttemptEventType, occurredAt: Date, metadata: EventMetadata) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtIncidentWrite);
    const result = await this.repository.recordEvent(schoolId, attemptId, await this.studentId(principal, schoolId), operationId, sequence, eventType, occurredAt, metadata);
    if (result.accepted) await this.audit.record({ schoolId, actorUserId: principal.userId, action: `cbt-attempt-event.${eventType}`, objectType: "cbt_attempt", objectId: attemptId, outcome: "allowed", requestId, after: { sequence, occurredAt: occurredAt.toISOString() } });
    return result.event;
  }

  async listEvents(principal: AuthenticatedPrincipal, attemptId: string, afterSequence: number) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtIncidentRead);
    const linkedStudent = await this.students.findByUserId(schoolId, principal.userId);
    return this.repository.listEvents(schoolId, attemptId, linkedStudent ? linkedStudent.id : undefined, afterSequence);
  }
}
