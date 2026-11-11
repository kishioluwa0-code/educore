import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { loadEnv } from "../common/env.js";
import { CbtResultJobRepository } from "./cbt-result-job.repository.js";
import { ResultRepository } from "./result.repository.js";

@Injectable()
export class CbtResultWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly workerId = `cbt-worker-${process.pid}`;
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(CbtResultJobRepository) private readonly jobs: CbtResultJobRepository,
    @Inject(ResultRepository) private readonly results: ResultRepository,
  ) {}

  onModuleInit() {
    if (!loadEnv().EDUCORE_CBT_WORKER_ENABLED) return;
    this.timer = setInterval(() => {
      void this.processOne().catch((error: unknown) => {
        console.error("CBT result worker iteration failed", error);
      });
    }, 1_000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async processOne() {
    const job = await this.jobs.claim(this.workerId);
    if (!job) return false;
    try {
      const payload = job.payload as {
        attemptId?: string;
        resultId?: string;
        requestedByUserId?: string;
      };
      if (!payload.requestedByUserId) throw new Error("CBT result job has no authorized actor");
      if (job.jobType === "marking" && payload.attemptId) {
        await this.results.mark(job.schoolId, payload.attemptId, payload.requestedByUserId);
      } else if (
        (job.jobType === "publication" || job.jobType === "reconciliation") &&
        payload.resultId
      ) {
        await this.results.publish(job.schoolId, payload.resultId, payload.requestedByUserId);
      } else {
        throw new Error("CBT result job payload is invalid");
      }
      await this.jobs.succeed(job.id, this.workerId);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown CBT worker failure";
      const retryAt =
        job.attempts < 8
          ? new Date(Date.now() + Math.min(300_000, 2 ** job.attempts * 1_000))
          : undefined;
      await this.jobs.fail(job.id, this.workerId, message, retryAt);
      return false;
    }
  }
}
