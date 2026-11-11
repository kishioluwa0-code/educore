import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { cbtPoolQuestions, cbtPools, questionBankItems, questionBankVersions } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type CbtMode = "school" | "practice";
export type ResultPolicy = { showScore: boolean; showCorrectAnswers: boolean; release: "immediate" | "after_close" };

@Injectable()
export class CbtPoolRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(schoolId: string, input: { code: string; name: string; mode: CbtMode; resultPolicy: ResultPolicy }, userId: string) {
    const [pool] = await this.database.db.insert(cbtPools).values({ schoolId, ...input, createdByUserId: userId }).returning();
    if (!pool) throw new ConflictException("CBT pool could not be created");
    return pool;
  }

  async list(schoolId: string, mode?: CbtMode) {
    return this.database.db.select().from(cbtPools).where(and(eq(cbtPools.schoolId, schoolId), mode ? eq(cbtPools.mode, mode) : undefined)).orderBy(asc(cbtPools.createdAt));
  }

  async find(schoolId: string, id: string) {
    const [pool] = await this.database.db.select().from(cbtPools).where(and(eq(cbtPools.schoolId, schoolId), eq(cbtPools.id, id))).limit(1);
    if (!pool) throw new NotFoundException("CBT pool not found");
    const questions = await this.database.db
      .select({ entry: cbtPoolQuestions, version: questionBankVersions, question: questionBankItems })
      .from(cbtPoolQuestions)
      .innerJoin(questionBankVersions, eq(cbtPoolQuestions.questionVersionId, questionBankVersions.id))
      .innerJoin(questionBankItems, eq(questionBankVersions.questionId, questionBankItems.id))
      .where(eq(cbtPoolQuestions.poolId, id))
      .orderBy(asc(cbtPoolQuestions.position));
    return { ...pool, questions };
  }

  async addQuestion(schoolId: string, poolId: string, questionVersionId: string, position: number) {
    const pool = await this.find(schoolId, poolId);
    if (pool.status !== "draft") throw new ConflictException("Only draft pools can be edited");
    const [version] = await this.database.db.select({ version: questionBankVersions, question: questionBankItems })
      .from(questionBankVersions)
      .innerJoin(questionBankItems, eq(questionBankVersions.questionId, questionBankItems.id))
      .where(and(eq(questionBankVersions.id, questionVersionId), eq(questionBankItems.schoolId, schoolId)))
      .limit(1);
    if (!version || version.version.status !== "reviewed" || version.question.status !== "reviewed") throw new ConflictException("Only reviewed question versions may be added to a pool");
    const [entry] = await this.database.db.insert(cbtPoolQuestions).values({ poolId, questionVersionId, position }).returning();
    if (!entry) throw new ConflictException("Question could not be added to pool");
    return entry;
  }

  async publish(schoolId: string, poolId: string, userId: string) {
    const pool = await this.find(schoolId, poolId);
    if (pool.status !== "draft" || pool.questions.length === 0) throw new ConflictException("A draft pool with at least one question is required");
    const [published] = await this.database.db.update(cbtPools).set({ status: "published", publishedByUserId: userId, publishedAt: new Date(), updatedAt: new Date() }).where(and(eq(cbtPools.schoolId, schoolId), eq(cbtPools.id, poolId), eq(cbtPools.status, "draft"))).returning();
    if (!published) throw new ConflictException("CBT pool was changed by another request");
    return published;
  }

  async archive(schoolId: string, poolId: string) {
    const [archived] = await this.database.db.update(cbtPools).set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() }).where(and(eq(cbtPools.schoolId, schoolId), eq(cbtPools.id, poolId), eq(cbtPools.status, "published"))).returning();
    if (!archived) throw new ConflictException("Only published pools can be archived");
    return archived;
  }
}
