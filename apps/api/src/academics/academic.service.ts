import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { AcademicRepository } from "./academic.repository.js";

@Injectable()
export class AcademicService {
  constructor(
    @Inject(AcademicRepository) private readonly repository: AcademicRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal, manage = false) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(principal, membership.schoolId, manage ? CAPABILITIES.academicStructureManage : CAPABILITIES.academicStructureRead);
    return membership.schoolId;
  }

  async structureList(principal: AuthenticatedPrincipal) { const schoolId = this.school(principal); return { sessions: await this.repository.listSessions(schoolId), classes: await this.repository.listClasses(schoolId), subjects: await this.repository.listSubjects(schoolId) }; }
  async structureCreate(principal: AuthenticatedPrincipal, requestId: string, kind: string, input: any) { const schoolId = this.school(principal, true); const created = kind === "session" ? await this.repository.createSession(schoolId, input) : kind === "class" ? await this.repository.createClass(schoolId, input) : await this.repository.createSubject(schoolId, input); await this.audit.record({ schoolId, actorUserId: principal.userId, action: `academic.structure.${kind}.create`, objectType: `academic_${kind}`, objectId: created.id, outcome: "allowed", requestId, after: created }); return created; }
  async structureUpdate(principal: AuthenticatedPrincipal, requestId: string, kind: string, id: string, input: any) { const schoolId = this.school(principal, true); const updated = kind === "session" ? await this.repository.updateSession(schoolId, id, input) : kind === "class" ? await this.repository.updateClass(schoolId, id, input) : await this.repository.updateSubject(schoolId, id, input); if (!updated) throw new NotFoundException("Academic record not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: `academic.structure.${kind}.update`, objectType: `academic_${kind}`, objectId: id, outcome: "allowed", requestId, after: updated }); return updated; }
  async structureDelete(principal: AuthenticatedPrincipal, requestId: string, kind: string, id: string) { const schoolId = this.school(principal, true); const deleted = kind === "session" ? await this.repository.deleteSession(schoolId, id) : kind === "class" ? await this.repository.deleteClass(schoolId, id) : await this.repository.deleteSubject(schoolId, id); if (!deleted) throw new NotFoundException("Academic record not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: `academic.structure.${kind}.delete`, objectType: `academic_${kind}`, objectId: id, outcome: "allowed", requestId, after: deleted }); return deleted; }

  async terms(principal: AuthenticatedPrincipal, sessionId: string) { const schoolId = this.school(principal); return this.repository.listTerms(schoolId, sessionId); }
  async createTerm(principal: AuthenticatedPrincipal, requestId: string, sessionId: string, input: any) { const schoolId = this.school(principal, true); if (input.endsAt && input.startsAt && input.endsAt < input.startsAt) throw new ConflictException("Term end date must be after the start date"); const created = await this.repository.createTerm(schoolId, sessionId, input); if (!created) throw new NotFoundException("Academic session not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: "academic.structure.term.create", objectType: "academic_term", objectId: created.id, outcome: "allowed", requestId, after: created }); return created; }
  async updateTerm(principal: AuthenticatedPrincipal, requestId: string, id: string, input: any) { const schoolId = this.school(principal, true); const updated = await this.repository.updateTerm(schoolId, id, input); if (!updated) throw new NotFoundException("Academic term not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: "academic.structure.term.update", objectType: "academic_term", objectId: id, outcome: "allowed", requestId, after: updated }); return updated; }
  async deleteTerm(principal: AuthenticatedPrincipal, requestId: string, id: string) { const schoolId = this.school(principal, true); const deleted = await this.repository.deleteTerm(schoolId, id); if (!deleted) throw new NotFoundException("Academic term not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: "academic.structure.term.delete", objectType: "academic_term", objectId: id, outcome: "allowed", requestId, after: deleted }); return deleted; }

  async arms(principal: AuthenticatedPrincipal, classId: string) { const schoolId = this.school(principal); return this.repository.listArms(schoolId, classId); }
  async createArm(principal: AuthenticatedPrincipal, requestId: string, classId: string, name: string) { const schoolId = this.school(principal, true); const created = await this.repository.createArm(schoolId, classId, name); if (!created) throw new NotFoundException("Academic class not found"); await this.audit.record({ schoolId, actorUserId: principal.userId, action: "academic.structure.arm.create", objectType: "academic_arm", objectId: created.id, outcome: "allowed", requestId, after: created }); return created; }
  async updateArm(principal: AuthenticatedPrincipal, requestId: string, id: string, name: string) { const schoolId = this.school(principal, true); const updated = await this.repository.updateArm(schoolId, id, name); if (!updated) throw new NotFoundException("Academic arm not found"); return updated; }
  async deleteArm(principal: AuthenticatedPrincipal, requestId: string, id: string) { const schoolId = this.school(principal, true); const deleted = await this.repository.deleteArm(schoolId, id); if (!deleted) throw new NotFoundException("Academic arm not found"); return deleted; }

  resolveTeacherScope(principal: AuthenticatedPrincipal, sessionId?: string, termId?: string) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    this.authorization.requireCapability(principal, membership.schoolId, CAPABILITIES.teacherScopeRead);
    if (!principal.memberships.some((item) => item.schoolId === membership.schoolId && item.status === "active")) {
      throw new ForbiddenException("The requested school is not available");
    }
    return this.repository.resolveTeacherScope(membership.schoolId, principal.userId, sessionId, termId).then((scope) => ({
      schoolId: membership.schoolId,
      teacherUserId: principal.userId,
      sessionId: sessionId ?? null,
      termId: termId ?? null,
      ...scope,
    }));
  }
}
