import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { GradebookRepository, type ComponentPolicy } from "./gradebook.repository.js";

@Injectable()
export class GradebookService {
  constructor(
    @Inject(GradebookRepository) private readonly repository: GradebookRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal, manage = false) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(
      principal,
      membership.schoolId,
      manage ? CAPABILITIES.gradebookWrite : CAPABILITIES.gradebookRead,
    );
    return membership.schoolId;
  }

  private validateComponentPolicy(policy: ComponentPolicy[]) {
    const totalWeight = policy.reduce((sum, c) => sum + (c.weight || 0), 0);
    if (totalWeight !== 100) {
      throw new BadRequestException(`Component weights must sum to 100, got ${totalWeight}`);
    }
    if (policy.some((c) => !c.name || c.weight < 0 || c.weight > 100)) {
      throw new BadRequestException("Invalid component policy: each component must have a name and weight between 0 and 100");
    }
  }

  private validateScore(score: number) {
    if (score < 0 || score > 100) {
      throw new BadRequestException("Score must be between 0 and 100");
    }
  }

  async getOrCreateGradebook(
    principal: AuthenticatedPrincipal,
    classId: string,
    armId: string,
    sessionId: string,
    termId?: string,
    subjectId?: string,
  ) {
    const schoolId = this.school(principal, true);
    return this.repository.findOrCreateGradebook(schoolId, classId, armId, sessionId, termId || null, subjectId || null);
  }

  async updateComponentPolicy(principal: AuthenticatedPrincipal, requestId: string, gradebookId: string, policy: ComponentPolicy[]) {
    const schoolId = this.school(principal, true);
    this.validateComponentPolicy(policy);

    const result = await this.repository.updateComponentPolicy(gradebookId, schoolId, policy);

    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "gradebook.policy.update",
      objectType: "gradebook",
      objectId: gradebookId,
      outcome: "allowed",
      requestId,
      after: { policy },
    });

    return result;
  }

  async setGradeRow(
    principal: AuthenticatedPrincipal,
    requestId: string,
    gradebookId: string,
    studentId: string,
    scores: Record<string, number>,
    expectedVersion?: number,
  ) {
    const schoolId = this.school(principal, true);
    const gradebook = await this.repository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");
    if (!(await this.repository.studentBelongsToGradebookSchool(gradebookId, studentId, schoolId))) {
      throw new BadRequestException("Student is not in the gradebook school");
    }

    // Validate all scores
    Object.values(scores).forEach((score) => this.validateScore(score));

    const membership = this.tenancy.resolveActiveMembership(principal);
    const isAdministrator = membership.roleKeys.includes("administrator");
    const result = await this.repository.upsertGradeRow(gradebookId, studentId, scores, expectedVersion, isAdministrator, isAdministrator ? principal.userId : undefined);

    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "gradebook.score.set",
      objectType: "grade_row",
      objectId: result.id,
      outcome: "allowed",
      requestId,
      after: { scores },
    });

    return result;
  }

  async getGradebook(principal: AuthenticatedPrincipal, gradebookId: string) {
    const schoolId = this.school(principal);
    return this.repository.getGradebook(gradebookId, schoolId);
  }

  async getGradeRow(principal: AuthenticatedPrincipal, gradebookId: string, studentId: string) {
    this.school(principal);
    return this.repository.getGradeRow(gradebookId, studentId);
  }

  async listGradeRows(principal: AuthenticatedPrincipal, gradebookId: string) {
    this.school(principal);
    return this.repository.listGradeRows(gradebookId);
  }
}
