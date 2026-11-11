import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { AssignmentRepository, type AssignmentInput } from "./assignment.repository.js";

@Injectable()
export class AssignmentService {
  constructor(
    @Inject(AssignmentRepository) private readonly repository: AssignmentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal, filters: Parameters<AssignmentRepository["list"]>[1]) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(principal, membership.schoolId, CAPABILITIES.academicAssignmentRead);
    return this.repository.list(membership.schoolId, filters);
  }

  async create(principal: AuthenticatedPrincipal, requestId: string, input: AssignmentInput) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(principal, membership.schoolId, CAPABILITIES.academicAssignmentManage);
    const created = await this.repository.create(membership.schoolId, input);
    await this.audit.record({ schoolId: membership.schoolId, actorUserId: principal.userId, action: "academic.assignment.create", objectType: `teacher_${input.type}_assignment`, objectId: created.id, outcome: "allowed", requestId, after: created as unknown as Record<string, unknown> });
    return created;
  }

  async close(principal: AuthenticatedPrincipal, requestId: string, type: AssignmentInput["type"], id: string, effectiveTo: Date) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(principal, membership.schoolId, CAPABILITIES.academicAssignmentManage);
    const closed = await this.repository.close(membership.schoolId, type, id, effectiveTo);
    await this.audit.record({ schoolId: membership.schoolId, actorUserId: principal.userId, action: "academic.assignment.close", objectType: `teacher_${type}_assignment`, objectId: id, outcome: "allowed", requestId, after: closed as unknown as Record<string, unknown> });
    return closed;
  }
}
