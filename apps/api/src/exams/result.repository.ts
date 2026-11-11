import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { assessmentScoreSources, cbtAttempts, cbtPools, cbtResults, examConfigurations, gradebooks, gradeRows, gradebookSubmissions, questionBankVersions } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

type FrozenQuestion = { position: number; questionVersionId: string; type: string };
type AnswerMap = Record<string, string | string[]>;
type ResultPolicy = { showScore: boolean; showCorrectAnswers: boolean; release: "immediate" | "after_close" };
type ResultBreakdownItem = {
  position: number;
  questionVersionId: string;
  points: number;
  awarded: number;
  status: string;
};

function normalizedAnswers(value: string | string[]) {
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim().toLowerCase()).sort();
}

@Injectable()
export class ResultRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async mark(schoolId: string, attemptId: string, userId: string) {
    const [attempt] = await this.database.db.select({ attempt: cbtAttempts, configuration: examConfigurations, pool: cbtPools })
      .from(cbtAttempts)
      .innerJoin(examConfigurations, eq(cbtAttempts.configurationId, examConfigurations.id))
      .innerJoin(cbtPools, eq(examConfigurations.poolId, cbtPools.id))
      .where(and(eq(cbtAttempts.id, attemptId), eq(examConfigurations.schoolId, schoolId)))
      .limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");
    if (attempt.attempt.status !== "submitted" && attempt.attempt.status !== "expired") throw new ConflictException("Only completed attempts can be marked");

    const frozen = attempt.attempt.questionOrder as FrozenQuestion[];
    const versions = await this.database.db.select().from(questionBankVersions).where(inArray(questionBankVersions.id, frozen.map((question) => question.questionVersionId)));
    const byId = new Map(versions.map((version) => [version.id, version]));
    const answers = (attempt.attempt.answers ?? {}) as AnswerMap;
    let score = 0;
    let maxScore = 0;
    let pendingManualCount = 0;
    const breakdown = frozen.map((question) => {
      const version = byId.get(question.questionVersionId);
      if (!version) throw new ConflictException("Attempt references a missing question version");
      maxScore += version.points;
      const answer = answers[question.questionVersionId];
      if (version.type === "short_answer") {
        pendingManualCount += 1;
        return { position: question.position, questionVersionId: question.questionVersionId, points: version.points, awarded: 0, status: "pending_manual" };
      }
      const correct = normalizedAnswers(version.correctAnswer);
      const submitted = answer === undefined ? [] : normalizedAnswers(answer);
      const awarded = correct.length === submitted.length && correct.every((value, index) => value === submitted[index]) ? version.points : 0;
      score += awarded;
      return { position: question.position, questionVersionId: question.questionVersionId, points: version.points, awarded, status: awarded ? "correct" : "incorrect" };
    });

    const existing = await this.database.db.select().from(cbtResults).where(eq(cbtResults.attemptId, attemptId)).limit(1);
    if (existing[0]) return existing[0];
    const [result] = await this.database.db.insert(cbtResults).values({
      attemptId,
      configurationId: attempt.configuration.id,
      studentId: attempt.attempt.studentId,
      score,
      maxScore,
      pendingManualCount,
      breakdown,
      markedByUserId: userId,
    }).returning();
    if (!result) throw new ConflictException("Result could not be marked");
    return result;
  }

  async publish(schoolId: string, resultId: string, userId: string) {
    const [row] = await this.database.db.select({ result: cbtResults, configuration: examConfigurations, pool: cbtPools })
      .from(cbtResults)
      .innerJoin(examConfigurations, eq(cbtResults.configurationId, examConfigurations.id))
      .innerJoin(cbtPools, eq(examConfigurations.poolId, cbtPools.id))
      .where(and(eq(cbtResults.id, resultId), eq(examConfigurations.schoolId, schoolId)))
      .limit(1);
    if (!row) throw new NotFoundException("Result not found");
    if (row.result.status === "published") return row.result;
    if (row.result.pendingManualCount > 0) throw new ConflictException("Manual marking is incomplete");
    const policy = row.pool.resultPolicy as ResultPolicy;
    if (policy.release === "after_close" && new Date() < row.configuration.closesAt) throw new ConflictException("Result cannot be published before the exam closes");
    const configuration = row.configuration;
    return this.database.db.transaction(async (tx) => {
      const [gradebookLock] = configuration.gradebookId
        ? await tx.select({ id: gradebooks.id }).from(gradebooks).where(and(eq(gradebooks.id, configuration.gradebookId), eq(gradebooks.schoolId, schoolId))).for("update")
        : [];
      if (configuration.gradebookId && !gradebookLock) throw new ConflictException("Configured gradebook is outside the school");
      if (configuration.gradebookId) {
        const [submission] = await tx.select({ status: gradebookSubmissions.status })
          .from(gradebookSubmissions)
          .where(eq(gradebookSubmissions.gradebookId, configuration.gradebookId))
          .limit(1);
        if (submission?.status === "published") throw new ConflictException("Published gradebooks cannot receive automatic score updates");
      }

      const [published] = await tx.update(cbtResults).set({ status: "published", publishedAt: new Date(), publishedByUserId: userId, updatedAt: new Date() })
        .where(and(eq(cbtResults.id, resultId), eq(cbtResults.status, "marked"))).returning();
      if (!published) throw new ConflictException("Result changed while publishing");
      if (configuration.gradebookId && configuration.gradeComponentKey) {
        const [gradebook] = await tx.select().from(gradebooks).where(and(eq(gradebooks.id, configuration.gradebookId), eq(gradebooks.schoolId, schoolId))).limit(1);
        if (!gradebook) throw new ConflictException("Configured gradebook is outside the school");
        const [existingRow] = await tx.select().from(gradeRows).where(and(eq(gradeRows.gradebookId, gradebook.id), eq(gradeRows.studentId, published.studentId))).limit(1);
        const scores = { ...(existingRow?.scores as Record<string, number> | undefined), [configuration.gradeComponentKey]: published.score };
        const scoreSources = {
          ...(existingRow?.scoreSources as Record<string, unknown> | undefined),
          [configuration.gradeComponentKey]: { type: "cbt", sourceId: published.id, editable: false },
        };
        const gradeRow = existingRow
         ? (await tx.update(gradeRows).set({ scores, scoreSources, version: existingRow.version + 1, updatedAt: new Date() }).where(and(eq(gradeRows.id, existingRow.id), eq(gradeRows.version, existingRow.version))).returning())[0]
         : (await tx.insert(gradeRows).values({ gradebookId: gradebook.id, studentId: published.studentId, scores, scoreSources }).returning())[0];
        if (!gradeRow) throw new ConflictException("Gradebook row changed while synchronizing CBT result");
        await tx.insert(assessmentScoreSources).values({ sourceType: "cbt_result", sourceId: published.id, gradebookId: gradebook.id, gradeRowId: gradeRow.id, studentId: published.studentId, componentKey: configuration.gradeComponentKey, score: published.score }).onConflictDoNothing();
      }
      return published;
    });
  }

  async findForRead(schoolId: string, resultId: string, studentId?: string) {
    const conditions = [eq(cbtResults.id, resultId), eq(examConfigurations.schoolId, schoolId), eq(cbtResults.status, "published")];
    if (studentId) conditions.push(eq(cbtResults.studentId, studentId));
    const [row] = await this.database.db.select({ result: cbtResults, configuration: examConfigurations, pool: cbtPools })
      .from(cbtResults)
      .innerJoin(examConfigurations, eq(cbtResults.configurationId, examConfigurations.id))
      .innerJoin(cbtPools, eq(examConfigurations.poolId, cbtPools.id))
      .where(and(...conditions))
      .limit(1);
    if (!row) throw new NotFoundException("Published result not found");
    return row.result;
  }

  async markShortAnswer(
    schoolId: string,
    resultId: string,
    questionVersionId: string,
    awarded: number,
    userId: string,
  ) {
    return this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .select({ result: cbtResults, configuration: examConfigurations })
        .from(cbtResults)
        .innerJoin(examConfigurations, eq(cbtResults.configurationId, examConfigurations.id))
        .where(and(eq(cbtResults.id, resultId), eq(examConfigurations.schoolId, schoolId)))
        .for("update")
        .limit(1);
      if (!row) throw new NotFoundException("Result not found");
      if (row.result.status === "published") throw new ConflictException("Published results cannot be changed");
      if (row.result.status !== "marked") throw new ConflictException("Only marked results can be manually graded");

      const breakdown = row.result.breakdown as ResultBreakdownItem[];
      const item = breakdown.find((entry) => entry.questionVersionId === questionVersionId);
      if (!item) throw new NotFoundException("Question is not part of this result");
      if (item.status !== "pending_manual") {
        if (item.awarded === awarded) return row.result;
        throw new ConflictException("This question has already been manually graded");
      }
      if (!Number.isInteger(awarded) || awarded < 0 || awarded > item.points) {
        throw new ConflictException(`Awarded points must be an integer between 0 and ${item.points}`);
      }

      const nextBreakdown = breakdown.map((entry) =>
        entry.questionVersionId === questionVersionId
          ? { ...entry, awarded, status: awarded > 0 ? "manual_awarded" : "manual_incorrect" }
          : entry,
      );
      const [updated] = await tx
        .update(cbtResults)
        .set({
          score: row.result.score + awarded,
          pendingManualCount: row.result.pendingManualCount - 1,
          breakdown: nextBreakdown,
          markedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(and(eq(cbtResults.id, resultId), eq(cbtResults.status, "marked")))
        .returning();
      if (!updated) throw new ConflictException("Result changed while manually grading");
      return updated;
    });
  }
}
