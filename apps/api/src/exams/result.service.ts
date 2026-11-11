import { Inject, Injectable } from "@nestjs/common";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { StudentRepository } from "../students/student.repository.js";
import { loadEnv } from "../common/env.js";
import { CbtResultJobService } from "./cbt-result-job.service.js";
import { ResultRepository } from "./result.repository.js";

@Injectable()
export class ResultService {
  constructor(
    @Inject(ResultRepository) private readonly repository: ResultRepository,
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CbtResultJobService) private readonly jobs: CbtResultJobService,
  ) {}

  private school(principal: AuthenticatedPrincipal) {
    return this.tenancy.resolveActiveMembership(principal).schoolId;
  }

  async mark(principal: AuthenticatedPrincipal, requestId: string, attemptId: string) {
    const schoolId = this.school(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtResultMark);
    if (loadEnv().EDUCORE_CBT_WORKER_ENABLED) {
      const job = await this.jobs.enqueueMarking(schoolId, attemptId, principal.userId);
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "cbt-result.mark.queued",
        objectType: "cbt_result_job",
        objectId: job.id,
        outcome: "allowed",
        requestId,
        after: { jobType: job.jobType, workKey: job.workKey },
      });
      return job;
    }
    const result = await this.repository.mark(schoolId, attemptId, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-result.mark", objectType: "cbt_result", objectId: result.id, outcome: "allowed", requestId, after: { score: result.score, maxScore: result.maxScore, pendingManualCount: result.pendingManualCount } });
    return result;
  }

  async publish(principal: AuthenticatedPrincipal, requestId: string, resultId: string) {
    const schoolId = this.school(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtResultPublish);
    if (loadEnv().EDUCORE_CBT_WORKER_ENABLED) {
      const job = await this.jobs.enqueuePublication(schoolId, resultId, principal.userId);
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "cbt-result.publish.queued",
        objectType: "cbt_result_job",
        objectId: job.id,
        outcome: "allowed",
        requestId,
        after: { jobType: job.jobType, workKey: job.workKey },
      });
      return job;
    }
    const result = await this.repository.publish(schoolId, resultId, principal.userId);
    await this.audit.record({ schoolId, actorUserId: principal.userId, action: "cbt-result.publish", objectType: "cbt_result", objectId: result.id, outcome: "allowed", requestId, after: { status: result.status, publishedAt: result.publishedAt } });
    return result;
  }

  async markShortAnswer(
    principal: AuthenticatedPrincipal,
    requestId: string,
    resultId: string,
    questionVersionId: string,
    awarded: number,
  ) {
    const schoolId = this.school(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtResultMark);
    const result = await this.repository.markShortAnswer(
      schoolId,
      resultId,
      questionVersionId,
      awarded,
      principal.userId,
    );
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "cbt-result.short-answer.mark",
      objectType: "cbt_result",
      objectId: result.id,
      outcome: "allowed",
      requestId,
      after: { questionVersionId, awarded, pendingManualCount: result.pendingManualCount },
    });
    return result;
  }

  async get(principal: AuthenticatedPrincipal, resultId: string) {
    const schoolId = this.school(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.cbtResultRead);
    const student = await this.students.findByUserId(schoolId, principal.userId);
    return this.repository.findForRead(schoolId, resultId, student?.id);
  }
}
