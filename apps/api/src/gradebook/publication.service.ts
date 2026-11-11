import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { PublicationRepository } from "./publication.repository.js";
import { GradebookRepository } from "./gradebook.repository.js";

@Injectable()
export class PublicationService {
  constructor(
    @Inject(PublicationRepository) private readonly repository: PublicationRepository,
    @Inject(GradebookRepository) private readonly gradebookRepository: GradebookRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  private school(principal: AuthenticatedPrincipal) {
    const membership = this.tenancy.resolveActiveMembership(principal);
    return membership.schoolId;
  }

  async submitGradebook(principal: AuthenticatedPrincipal, requestId: string, gradebookId: string) {
    const schoolId = this.school(principal);
    
    // Verify gradebook exists and belongs to school
    const gradebook = await this.gradebookRepository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");

    // Check if already published
    const isPublished = await this.repository.isPublished(gradebookId);
    if (isPublished) throw new ConflictException("Cannot modify a published gradebook");

    // Teacher must have gradebookWrite capability
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookWrite);

    const result = await this.repository.submitGradebook(gradebookId, principal.userId);

    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "gradebook.submit",
      objectType: "gradebook_submission",
      objectId: result.id,
      outcome: "allowed",
      requestId,
      after: { status: result.status },
    });

    return result;
  }

  async getSubmissionStatus(principal: AuthenticatedPrincipal, gradebookId: string) {
    const schoolId = this.school(principal);
    
    // Verify gradebook exists and belongs to school
    const gradebook = await this.gradebookRepository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");

    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookRead);

    return this.repository.getSubmission(gradebookId);
  }

  async reviewGradebook(
    principal: AuthenticatedPrincipal,
    requestId: string,
    gradebookId: string,
    action: "approve" | "requestModification",
    feedback?: unknown,
  ) {
    const schoolId = this.school(principal);
    
    // Verify gradebook exists and belongs to school
    const gradebook = await this.gradebookRepository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");

    // Principal/admin must have gradebookApprove capability
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookApprove);

    let result;
    if (action === "approve") {
      result = await this.repository.approveGradebook(gradebookId, principal.userId);
    } else {
      result = await this.repository.requestModification(gradebookId, principal.userId, feedback);
    }

    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: `gradebook.review.${action}`,
      objectType: "gradebook_submission",
      objectId: result.id,
      outcome: "allowed",
      requestId,
      after: { status: result.status, feedback },
    });

    return result;
  }

  async publishGradebook(principal: AuthenticatedPrincipal, requestId: string, gradebookId: string) {
    const schoolId = this.school(principal);
    
    // Verify gradebook exists and belongs to school
    const gradebook = await this.gradebookRepository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");

    // Principal/admin must have gradebookApprove capability
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookApprove);

    const result = await this.repository.publishGradebook(gradebookId, principal.userId);

    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "gradebook.publish",
      objectType: "gradebook_submission",
      objectId: result.id,
      outcome: "allowed",
      requestId,
      after: { status: result.status, publishedAt: result.publishedAt },
    });

    return result;
  }

  async getPublishedSnapshot(principal: AuthenticatedPrincipal, gradebookId: string) {
    const schoolId = this.school(principal);
    
    // Verify gradebook exists and belongs to school
    const gradebook = await this.gradebookRepository.getGradebook(gradebookId, schoolId);
    if (!gradebook) throw new BadRequestException("Gradebook not found");

    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookRead);

    const snapshot = await this.repository.getPublishedSnapshot(gradebookId);
    if (!snapshot) throw new BadRequestException("No published snapshot available");

    return snapshot;
  }
}
