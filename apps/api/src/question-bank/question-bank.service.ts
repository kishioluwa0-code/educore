import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { QuestionBankRepository, type QuestionInput } from "./question-bank.repository.js";

@Injectable()
export class QuestionBankService {
  constructor(
    @Inject(QuestionBankRepository) private readonly repository: QuestionBankRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal, capability: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, capability);
    return schoolId;
  }

  async list(principal: AuthenticatedPrincipal, status?: string) {
    return this.repository.list(this.school(principal, CAPABILITIES.questionBankRead), status);
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: QuestionInput) {
    const schoolId = this.school(principal, CAPABILITIES.questionBankManage);
    const result = await this.repository.create(schoolId, input, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "question-bank.create", objectType: "question", objectId: result.id, outcome: "allowed", requestId, after: result as unknown as Record<string, unknown> });
    return result;
  }

  async addVersion(principal: AuthenticatedPrincipal, requestId: string, questionId: string, input: Omit<QuestionInput, "code" | "subjectId" | "tags">) {
    const schoolId = this.school(principal, CAPABILITIES.questionBankManage);
    const version = await this.repository.addVersion(schoolId, questionId, input, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "question-bank.version.create", objectType: "question_version", objectId: version.id, outcome: "allowed", requestId, after: version as unknown as Record<string, unknown> });
    return version;
  }

  async review(principal: AuthenticatedPrincipal, requestId: string, questionId: string, versionId: string) {
    const schoolId = this.school(principal, CAPABILITIES.questionBankReview);
    if (principal.userId === "") throw new BadRequestException("Reviewer identity is required");
    const version = await this.repository.review(schoolId, questionId, versionId, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "question-bank.version.review", objectType: "question_version", objectId: version.id, outcome: "allowed", requestId, after: version as unknown as Record<string, unknown> });
    return version;
  }

  async retire(principal: AuthenticatedPrincipal, requestId: string, questionId: string) {
    const schoolId = this.school(principal, CAPABILITIES.questionBankReview);
    const item = await this.repository.retire(schoolId, questionId, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "question-bank.retire", objectType: "question", objectId: questionId, outcome: "allowed", requestId, after: item as unknown as Record<string, unknown> });
    return item;
  }
}
