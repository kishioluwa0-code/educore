import { Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { ExamRepository, type ExamInput } from "./exam.repository.js";

@Injectable()
export class ExamService {
  constructor(
    @Inject(ExamRepository) private readonly repository: ExamRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal, capability: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, capability);
    return schoolId;
  }

  async list(principal: AuthenticatedPrincipal) {
    return this.repository.list(this.school(principal, CAPABILITIES.examConfigRead));
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: ExamInput) {
    const schoolId = this.school(principal, CAPABILITIES.examConfigManage);
    const configuration = await this.repository.create(schoolId, input, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "exam.configuration.create", objectType: "exam_configuration", objectId: configuration.id, outcome: "allowed", requestId, after: configuration as unknown as Record<string, unknown> });
    return configuration;
  }

  async snapshot(principal: AuthenticatedPrincipal, requestId: string, id: string, studentIds: string[]) {
    const schoolId = this.school(principal, CAPABILITIES.examConfigPublish);
    const configuration = await this.repository.snapshotCandidates(schoolId, id, studentIds, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "exam.configuration.publish", objectType: "exam_configuration", objectId: id, outcome: "allowed", requestId, after: configuration as unknown as Record<string, unknown> });
    return configuration;
  }
}
