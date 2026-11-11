import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, lte, lt, or } from "drizzle-orm";
import { cbtResultJobs } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type CbtResultJobType = "marking" | "publication" | "reconciliation";
export type CbtResultJob = typeof cbtResultJobs.$inferSelect;

@Injectable()
export class CbtResultJobRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async enqueue(
    schoolId: string,
    type: CbtResultJobType,
    workId: string,
    payload: Record<string, unknown> = {},
  ) {
    const workKey = `${schoolId}:${type}:${workId}`;
    const [inserted] = await this.database.db
      .insert(cbtResultJobs)
      .values({ schoolId, jobType: type, workKey, payload })
      .onConflictDoNothing({ target: cbtResultJobs.workKey })
      .returning();
    if (inserted) return inserted;
    const [existing] = await this.database.db
      .select()
      .from(cbtResultJobs)
      .where(eq(cbtResultJobs.workKey, workKey))
      .limit(1);
    if (!existing) throw new NotFoundException("CBT result job could not be enqueued");
    return existing;
  }

  async claim(workerId: string, leaseSeconds = 60): Promise<CbtResultJob | undefined> {
    const now = new Date();
    const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000);
    return this.database.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(cbtResultJobs)
        .where(
          or(
            and(eq(cbtResultJobs.status, "pending"), lte(cbtResultJobs.nextRunAt, now)),
            and(eq(cbtResultJobs.status, "running"), lt(cbtResultJobs.leaseExpiresAt, now)),
          ),
        )
        .orderBy(cbtResultJobs.nextRunAt)
        .limit(1)
        .for("update", { skipLocked: true });
      if (!job) return undefined;
      const [claimed] = await tx
        .update(cbtResultJobs)
        .set({
          status: "running",
          attempts: job.attempts + 1,
          leaseOwner: workerId,
          leaseExpiresAt,
          updatedAt: now,
          lastError: null,
        })
        .where(eq(cbtResultJobs.id, job.id))
        .returning();
      return claimed;
    });
  }

  async succeed(id: string, workerId: string) {
    const [job] = await this.database.db
      .update(cbtResultJobs)
      .set({
        status: "succeeded",
        completedAt: new Date(),
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cbtResultJobs.id, id),
          eq(cbtResultJobs.status, "running"),
          eq(cbtResultJobs.leaseOwner, workerId),
        ),
      )
      .returning();
    if (!job) throw new NotFoundException("CBT result job is not owned by this worker");
    return job;
  }

  async fail(id: string, workerId: string, error: string, retryAt?: Date) {
    const nextRunAt = retryAt ?? new Date(Date.now() + 2 ** 8 * 1000);
    const [job] = await this.database.db
      .update(cbtResultJobs)
      .set({
        status: retryAt ? "pending" : "failed",
        nextRunAt,
        lastError: error,
        leaseOwner: null,
        leaseExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cbtResultJobs.id, id),
          eq(cbtResultJobs.status, "running"),
          eq(cbtResultJobs.leaseOwner, workerId),
        ),
      )
      .returning();
    if (!job) throw new NotFoundException("CBT result job is not owned by this worker");
    return job;
  }

  async recoverStaleLeases(now = new Date()) {
    return this.database.db
      .update(cbtResultJobs)
      .set({
        status: "pending",
        leaseOwner: null,
        leaseExpiresAt: null,
        nextRunAt: now,
        updatedAt: now,
      })
      .where(and(eq(cbtResultJobs.status, "running"), lt(cbtResultJobs.leaseExpiresAt, now)))
      .returning();
  }
}
