import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, gt } from "drizzle-orm";
import { sql as drizzleSql } from "drizzle-orm";
import { cbtAttempts, cbtAttemptEvents, cbtAutosaves, cbtPoolQuestions, cbtQuestionAllocations, examCandidates, examConfigurations, questionBankVersions } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type AnswerMap = Record<string, string | string[]>;
export type AttemptEventType = "connected" | "disconnected" | "reconnected" | "fullscreen_exit" | "fullscreen_enter" | "tab_hidden" | "tab_visible" | "blur" | "focus";
export type EventMetadata = Record<string, string | number | boolean>;

@Injectable()
export class AttemptRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async start(schoolId: string, configurationId: string, studentId: string) {
    return this.database.db.transaction(async (tx) => {
      await tx.execute(drizzleSql`select id from exam_configurations where id = ${configurationId} and school_id = ${schoolId} for update`);
      const [configuration] = await tx.select().from(examConfigurations).where(and(eq(examConfigurations.id, configurationId), eq(examConfigurations.schoolId, schoolId))).limit(1);
      if (!configuration || configuration.status !== "published") throw new ConflictException("Exam is not available");
      const now = new Date();
      if (now < configuration.opensAt || now >= configuration.closesAt) throw new ConflictException("Exam is outside its active window");
      const [candidate] = await tx.select().from(examCandidates).where(and(eq(examCandidates.configurationId, configurationId), eq(examCandidates.studentId, studentId))).limit(1);
      if (!candidate) throw new NotFoundException("Student is not an exam candidate");
      const [existing] = await tx.select().from(cbtAttempts).where(and(eq(cbtAttempts.configurationId, configurationId), eq(cbtAttempts.studentId, studentId))).limit(1);
      if (existing) return existing;
      const poolRows = await tx.select({ position: cbtPoolQuestions.position, questionVersionId: cbtPoolQuestions.questionVersionId, version: questionBankVersions }).from(cbtPoolQuestions)
        .innerJoin(questionBankVersions, eq(cbtPoolQuestions.questionVersionId, questionBankVersions.id))
        .where(eq(cbtPoolQuestions.poolId, configuration.poolId)).orderBy(asc(cbtPoolQuestions.position));
      const allocated = await tx.select({ questionVersionId: cbtQuestionAllocations.questionVersionId }).from(cbtQuestionAllocations).where(eq(cbtQuestionAllocations.configurationId, configurationId));
      const allocatedIds = new Set(allocated.map((row) => row.questionVersionId));
      const available = poolRows.filter((row) => !allocatedIds.has(row.questionVersionId)).slice(0, configuration.questionsPerStudent);
      if (available.length !== configuration.questionsPerStudent) throw new ConflictException("No unique question set remains for this candidate");
      await tx.insert(cbtQuestionAllocations).values(available.map((row, index) => ({ configurationId, candidateId: candidate.id, questionVersionId: row.questionVersionId, position: index + 1 })));
      const questionOrder = available.map((row, index) => ({ position: index + 1, questionVersionId: row.version.id, type: row.version.type, prompt: row.version.prompt, options: row.version.options }));
      const [attempt] = await tx.insert(cbtAttempts).values({ configurationId, candidateId: candidate.id, studentId, questionOrder, expiresAt: configuration.closesAt }).returning();
      if (!attempt) throw new ConflictException("Attempt could not be created");
      return attempt;
    });
  }

  async find(schoolId: string, attemptId: string, studentId: string) {
    const [attempt] = await this.database.db.select({ attempt: cbtAttempts }).from(cbtAttempts).innerJoin(examConfigurations, eq(cbtAttempts.configurationId, examConfigurations.id))
      .where(and(eq(cbtAttempts.id, attemptId), eq(examConfigurations.schoolId, schoolId), eq(cbtAttempts.studentId, studentId))).limit(1);
    if (!attempt) throw new NotFoundException("Attempt not found");
    return attempt.attempt;
  }

  async autosave(schoolId: string, attemptId: string, studentId: string, operationId: string, sequence: number, answers: AnswerMap) {
    const attempt = await this.find(schoolId, attemptId, studentId);
    const now = new Date();
    if (attempt.status !== "active" || now >= attempt.expiresAt) {
      if (attempt.status === "active") await this.database.db.update(cbtAttempts).set({ status: "expired", updatedAt: now }).where(eq(cbtAttempts.id, attemptId));
      throw new ConflictException("Attempt is no longer accepting answers");
    }
    const [existing] = await this.database.db.select().from(cbtAutosaves).where(and(eq(cbtAutosaves.attemptId, attemptId), eq(cbtAutosaves.operationId, operationId))).limit(1);
    if (existing) return { attempt, accepted: false };
    if (sequence <= attempt.lastAutosaveSequence) throw new ConflictException("Autosave sequence must increase");
    const result = await this.database.db.transaction(async (tx) => {
      const [saved] = await tx.insert(cbtAutosaves).values({ attemptId, operationId, sequence, answers }).returning();
      if (!saved) throw new ConflictException("Autosave could not be persisted");
      const [updated] = await tx.update(cbtAttempts).set({ answers, lastAutosaveSequence: sequence, updatedAt: now }).where(and(eq(cbtAttempts.id, attemptId), eq(cbtAttempts.status, "active"), eq(cbtAttempts.lastAutosaveSequence, attempt.lastAutosaveSequence))).returning();
      if (!updated) throw new ConflictException("Attempt changed while autosaving");
      return updated;
    });
    return { attempt: result, accepted: true };
  }

  async submit(schoolId: string, attemptId: string, studentId: string) {
    const attempt = await this.find(schoolId, attemptId, studentId);
    const now = new Date();
    if (attempt.status !== "active") throw new ConflictException("Attempt is no longer active");
    const status = now >= attempt.expiresAt ? "expired" : "submitted";
    const [updated] = await this.database.db.update(cbtAttempts).set({ status, submittedAt: now, updatedAt: now }).where(and(eq(cbtAttempts.id, attemptId), eq(cbtAttempts.status, "active"))).returning();
    if (!updated) throw new ConflictException("Attempt changed while submitting");
    if (status === "expired") throw new ConflictException("Attempt expired before submission");
    return updated;
  }

  async recordEvent(
    schoolId: string,
    attemptId: string,
    studentId: string,
    operationId: string,
    sequence: number,
    eventType: AttemptEventType,
    occurredAt: Date,
    metadata: EventMetadata,
  ) {
    const attempt = await this.find(schoolId, attemptId, studentId);
    const now = new Date();
    if (occurredAt > new Date(now.getTime() + 5 * 60 * 1000) || occurredAt < attempt.startedAt) {
      throw new ConflictException("Event timestamp is outside the attempt window");
    }
    if (attempt.status !== "active" || now >= attempt.expiresAt) {
      if (attempt.status === "active") await this.database.db.update(cbtAttempts).set({ status: "expired", updatedAt: now }).where(eq(cbtAttempts.id, attemptId));
      throw new ConflictException("Attempt is no longer accepting events");
    }

    const result = await this.database.db.transaction(async (tx) => {
      const [existing] = await tx.select().from(cbtAttemptEvents).where(and(eq(cbtAttemptEvents.attemptId, attemptId), eq(cbtAttemptEvents.operationId, operationId))).limit(1);
      if (existing) return { event: existing, accepted: false };
      if (sequence <= attempt.lastEventSequence) throw new ConflictException("Event sequence must increase");
      const [event] = await tx.insert(cbtAttemptEvents).values({ attemptId, operationId, sequence, eventType, occurredAt, metadata }).returning();
      if (!event) throw new ConflictException("Attempt event could not be persisted");
      const disruptive = ["disconnected", "fullscreen_exit", "tab_hidden", "blur"].includes(eventType);
      const [updated] = await tx.update(cbtAttempts).set({ lastEventSequence: sequence, status: disruptive ? "expired" : "active", submittedAt: disruptive ? now : undefined, updatedAt: now }).where(and(eq(cbtAttempts.id, attemptId), eq(cbtAttempts.status, "active"), eq(cbtAttempts.lastEventSequence, attempt.lastEventSequence))).returning({ id: cbtAttempts.id });
      if (!updated) throw new ConflictException("Attempt changed while recording event");
      return { event, accepted: true };
    });
    return result;
  }

  async reset(schoolId: string, attemptId: string) {
    const [reset] = await this.database.db.update(cbtAttempts)
      .set({ status: "active", submittedAt: null, updatedAt: new Date() })
      .from(examConfigurations)
      .where(and(eq(cbtAttempts.id, attemptId), eq(cbtAttempts.configurationId, examConfigurations.id), eq(examConfigurations.schoolId, schoolId), eq(cbtAttempts.status, "expired"), gt(cbtAttempts.expiresAt, new Date())))
      .returning();
    if (!reset) throw new ConflictException("Attempt cannot be reset");
    return reset;
  }

  async listEvents(schoolId: string, attemptId: string, studentId: string | undefined, afterSequence: number) {
    const conditions = [eq(cbtAttempts.id, attemptId), eq(examConfigurations.schoolId, schoolId)];
    if (studentId) conditions.push(eq(cbtAttempts.studentId, studentId));
    const rows = await this.database.db.select({ event: cbtAttemptEvents }).from(cbtAttemptEvents)
      .innerJoin(cbtAttempts, eq(cbtAttemptEvents.attemptId, cbtAttempts.id))
      .innerJoin(examConfigurations, eq(cbtAttempts.configurationId, examConfigurations.id))
      .where(and(...conditions, gt(cbtAttemptEvents.sequence, afterSequence)))
      .orderBy(asc(cbtAttemptEvents.sequence));
    return rows.map((row) => row.event);
  }
}
