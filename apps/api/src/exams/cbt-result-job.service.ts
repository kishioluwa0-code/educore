import { Inject, Injectable } from "@nestjs/common";
import { CbtResultJobRepository } from "./cbt-result-job.repository.js";

@Injectable()
export class CbtResultJobService {
  constructor(@Inject(CbtResultJobRepository) private readonly jobs: CbtResultJobRepository) {}

  enqueueMarking(schoolId: string, attemptId: string, requestedByUserId: string) {
    return this.jobs.enqueue(schoolId, "marking", attemptId, { attemptId, requestedByUserId });
  }

  enqueuePublication(schoolId: string, resultId: string, requestedByUserId: string) {
    return this.jobs.enqueue(schoolId, "publication", resultId, { resultId, requestedByUserId });
  }

  enqueueReconciliation(schoolId: string, resultId: string, requestedByUserId: string) {
    return this.jobs.enqueue(schoolId, "reconciliation", resultId, { resultId, requestedByUserId });
  }

  claim(workerId: string, leaseSeconds?: number) {
    return this.jobs.claim(workerId, leaseSeconds);
  }

  succeed(id: string, workerId: string) {
    return this.jobs.succeed(id, workerId);
  }

  fail(id: string, workerId: string, error: string, retryAt?: Date) {
    return this.jobs.fail(id, workerId, error, retryAt);
  }

  recoverStaleLeases() {
    return this.jobs.recoverStaleLeases();
  }
}
