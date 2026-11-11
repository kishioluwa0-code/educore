import { Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { CbtPoolRepository, type CbtMode, type ResultPolicy } from "./cbt-pool.repository.js";

@Injectable()
export class CbtPoolService {
  constructor(
    @Inject(CbtPoolRepository) private readonly repository: CbtPoolRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal, capability: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, capability);
    return schoolId;
  }

  async list(principal: AuthenticatedPrincipal, mode?: CbtMode) {
    return this.repository.list(this.school(principal, CAPABILITIES.cbtPoolRead), mode);
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: { code: string; name: string; mode: CbtMode; resultPolicy: ResultPolicy }) {
    const schoolId = this.school(principal, CAPABILITIES.cbtPoolManage);
    const pool = await this.repository.create(schoolId, input, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-pool.create", objectType: "cbt_pool", objectId: pool.id, outcome: "allowed", requestId, after: pool as unknown as Record<string, unknown> });
    return pool;
  }

  async addQuestion(principal: AuthenticatedPrincipal, requestId: string, poolId: string, questionVersionId: string, position: number) {
    const schoolId = this.school(principal, CAPABILITIES.cbtPoolManage);
    const entry = await this.repository.addQuestion(schoolId, poolId, questionVersionId, position);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-pool.question.add", objectType: "cbt_pool_question", objectId: entry.id, outcome: "allowed", requestId, after: entry as unknown as Record<string, unknown> });
    return entry;
  }

  async publish(principal: AuthenticatedPrincipal, requestId: string, poolId: string) {
    const schoolId = this.school(principal, CAPABILITIES.cbtPoolPublish);
    const pool = await this.repository.publish(schoolId, poolId, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-pool.publish", objectType: "cbt_pool", objectId: poolId, outcome: "allowed", requestId, after: pool as unknown as Record<string, unknown> });
    return pool;
  }

  async archive(principal: AuthenticatedPrincipal, requestId: string, poolId: string) {
    const schoolId = this.school(principal, CAPABILITIES.cbtPoolPublish);
    const pool = await this.repository.archive(schoolId, poolId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-pool.archive", objectType: "cbt_pool", objectId: poolId, outcome: "allowed", requestId, after: pool as unknown as Record<string, unknown> });
    return pool;
  }
}
