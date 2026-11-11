import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { SchoolRepository } from "./school.repository.js";

@Injectable()
export class SchoolService {
  constructor(
    @Inject(SchoolRepository) private readonly repository: SchoolRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private schoolId(principal: AuthenticatedPrincipal) {
    if (!principal.activeSchoolId) throw new NotFoundException("No active school is selected");
    this.authorization.requireCapability(principal, principal.activeSchoolId, CAPABILITIES.schoolRead);
    return principal.activeSchoolId;
  }

  async get(principal: AuthenticatedPrincipal) {
    const school = await this.repository.find(this.schoolId(principal));
    if (!school) throw new NotFoundException("School not found");
    return school;
  }

  async save(principal: AuthenticatedPrincipal, requestId: string, input: Record<string, unknown>) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.schoolManage);
    const before = await this.repository.find(schoolId);
    const school = await this.repository.save(schoolId, principal.userId, input);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "school.setup.save", objectType: "school_setup", objectId: schoolId, outcome: "allowed", requestId, before, after: school });
    return school;
  }

  async listForSuperadmin(principal: AuthenticatedPrincipal) {
    if (principal.platformRole !== "superadmin") throw new NotFoundException("Platform access is required");
    return this.repository.listAll();
  }

  async approve(principal: AuthenticatedPrincipal, requestId: string, schoolId: string) {
    if (principal.platformRole !== "superadmin") throw new NotFoundException("Platform access is required");
    const school = await this.repository.setStatus(schoolId, "active");
    if (!school) throw new NotFoundException("School not found");
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "school.approve", objectType: "school", objectId: schoolId, outcome: "allowed", requestId, after: school });
    return school;
  }
}