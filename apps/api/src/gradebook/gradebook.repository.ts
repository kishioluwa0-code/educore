import { and, eq, isNull, sql } from "drizzle-orm";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { gradebooks, gradeRows, gradebookSubmissions, gradeSnapshots, academicClasses, academicArms, academicSessions, academicTerms, academicSubjects, students } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export interface ComponentPolicy {
  name: string;
  weight: number;
}

@Injectable()
export class GradebookRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async findOrCreateGradebook(schoolId: string, classId: string, armId: string, sessionId: string, termId: string | null, subjectId: string | null) {
    const existing = await this.database.db
      .select()
      .from(gradebooks)
      .where(
        and(
          eq(gradebooks.schoolId, schoolId),
          eq(gradebooks.classId, classId),
          eq(gradebooks.armId, armId),
          eq(gradebooks.sessionId, sessionId),
          termId ? eq(gradebooks.termId, termId) : isNull(gradebooks.termId),
          subjectId ? eq(gradebooks.subjectId, subjectId) : isNull(gradebooks.subjectId),
        ),
      )
      .limit(1);

    if (existing.length > 0) return existing[0];

    return (
      await this.database.db
        .insert(gradebooks)
        .values({ schoolId, classId, armId, sessionId, termId: termId || null, subjectId: subjectId || null, componentPolicy: [] })
        .returning()
    )[0];
  }

  async updateComponentPolicy(gradebookId: string, schoolId: string, policy: ComponentPolicy[]) {
    const gradebook = await this.database.db
      .select()
      .from(gradebooks)
      .where(and(eq(gradebooks.id, gradebookId), eq(gradebooks.schoolId, schoolId)))
      .limit(1);

    if (!gradebook.length) throw new NotFoundException("Gradebook not found");
    const submission = await this.database.db
      .select({ status: gradebookSubmissions.status })
      .from(gradebookSubmissions)
      .where(eq(gradebookSubmissions.gradebookId, gradebookId))
      .limit(1);
    if (submission[0]?.status === "published") throw new ConflictException("Cannot modify a published gradebook");

    return (
      await this.database.db
        .update(gradebooks)
        .set({ componentPolicy: policy, updatedAt: new Date() })
        .where(eq(gradebooks.id, gradebookId))
        .returning()
    )[0];
  }

  async getGradebook(gradebookId: string, schoolId: string) {
    return (
      await this.database.db
        .select({
          id: gradebooks.id,
          schoolId: gradebooks.schoolId,
          classId: gradebooks.classId,
          armId: gradebooks.armId,
          sessionId: gradebooks.sessionId,
          termId: gradebooks.termId,
          subjectId: gradebooks.subjectId,
          componentPolicy: gradebooks.componentPolicy,
          className: academicClasses.name,
          armName: academicArms.name,
          sessionName: academicSessions.name,
          termName: academicTerms.name,
          subjectCode: academicSubjects.code,
          subjectName: academicSubjects.name,
          createdAt: gradebooks.createdAt,
          updatedAt: gradebooks.updatedAt,
        })
        .from(gradebooks)
        .innerJoin(academicClasses, eq(academicClasses.id, gradebooks.classId))
        .innerJoin(academicArms, eq(academicArms.id, gradebooks.armId))
        .innerJoin(academicSessions, eq(academicSessions.id, gradebooks.sessionId))
        .leftJoin(academicTerms, eq(academicTerms.id, gradebooks.termId))
        .leftJoin(academicSubjects, eq(academicSubjects.id, gradebooks.subjectId))
        .where(and(eq(gradebooks.id, gradebookId), eq(gradebooks.schoolId, schoolId)))
        .limit(1)
    )[0];
  }

  async upsertGradeRow(gradebookId: string, studentId: string, scores: Record<string, number>, expectedVersion?: number, allowPublishedCorrection = false, correctionUserId?: string) {
    return this.database.db.transaction(async (tx) => {
      const [submission] = await tx.select()
        .from(gradebookSubmissions)
        .where(eq(gradebookSubmissions.gradebookId, gradebookId))
        .limit(1);
      if (submission?.status === "published" && (!allowPublishedCorrection || submission.manualCorrectionUsed)) {
        throw new ConflictException(submission.manualCorrectionUsed ? "The single published-grade correction has already been used" : "Published gradebooks require an administrator correction");
      }
      const existing = await tx
        .select()
        .from(gradeRows)
        .where(and(eq(gradeRows.gradebookId, gradebookId), eq(gradeRows.studentId, studentId)))
        .limit(1);

      if (existing.length > 0) {
      const currentScores = (existing[0].scores ?? {}) as Record<string, number>;
      const currentSources = (existing[0].scoreSources ?? {}) as Record<string, { type?: string }>;
      for (const componentKey of Object.keys(scores)) {
        if (currentSources[componentKey]?.type === "cbt") {
          throw new ConflictException(`Component '${componentKey}' is synchronized from CBT and cannot be edited manually`);
        }
      }
      const mergedScores = { ...currentScores, ...scores };
      const mergedSources = {
        ...currentSources,
        ...Object.fromEntries(Object.keys(scores).map((componentKey) => [componentKey, { type: "manual", editable: true }])),
      };
      const query = tx
          .update(gradeRows)
          .set({ scores: mergedScores, scoreSources: mergedSources, version: sql`${gradeRows.version} + 1`, updatedAt: new Date() })
          .where(and(
            eq(gradeRows.id, existing[0].id),
            ...(expectedVersion !== undefined ? [eq(gradeRows.version, expectedVersion)] : []),
          ))
          .returning();
      const updated = (await query)[0];
      if (!updated) throw new ConflictException("Grade row was changed by another request");
        if (submission?.status === "published" && correctionUserId) {
          await tx.update(gradebookSubmissions).set({ manualCorrectionUsed: true, manualCorrectedAt: new Date(), manualCorrectedByUserId: correctionUserId, updatedAt: new Date() }).where(and(eq(gradebookSubmissions.id, submission.id), eq(gradebookSubmissions.manualCorrectionUsed, false)));
          await tx.update(gradeSnapshots).set({ scores: mergedScores }).where(and(eq(gradeSnapshots.gradebookSubmissionId, submission.id), eq(gradeSnapshots.studentId, studentId)));
        }
        return updated;
      }

      if (submission?.status === "published") throw new ConflictException("A published gradebook correction must update an existing student row");
      return (
      await tx
        .insert(gradeRows)
        .values({
          gradebookId,
          studentId,
          scores,
          scoreSources: Object.fromEntries(Object.keys(scores).map((componentKey) => [componentKey, { type: "manual", editable: true }])),
        })
        .returning()
      )[0];
    });
  }

  async studentBelongsToGradebookSchool(gradebookId: string, studentId: string, schoolId: string) {
    return (await this.database.db
      .select({ id: students.id })
      .from(students)
      .innerJoin(gradebooks, eq(gradebooks.schoolId, students.schoolId))
      .where(and(
        eq(gradebooks.id, gradebookId),
        eq(students.id, studentId),
        eq(students.schoolId, schoolId),
      ))
      .limit(1)).length > 0;
  }

  async getGradeRow(gradebookId: string, studentId: string) {
    return (
      await this.database.db
        .select({
          id: gradeRows.id,
          gradebookId: gradeRows.gradebookId,
          studentId: gradeRows.studentId,
          scores: gradeRows.scores,
          scoreSources: gradeRows.scoreSources,
          submittedAt: gradeRows.submittedAt,
          submittedByUserId: gradeRows.submittedByUserId,
          createdAt: gradeRows.createdAt,
          updatedAt: gradeRows.updatedAt,
          studentFirstName: students.firstName,
          studentLastName: students.lastName,
        })
        .from(gradeRows)
        .leftJoin(students, eq(students.id, gradeRows.studentId))
        .where(and(eq(gradeRows.gradebookId, gradebookId), eq(gradeRows.studentId, studentId)))
        .limit(1)
    )[0];
  }

  async listGradeRows(gradebookId: string) {
    return this.database.db
      .select({
        id: gradeRows.id,
        gradebookId: gradeRows.gradebookId,
        studentId: gradeRows.studentId,
        scores: gradeRows.scores,
        scoreSources: gradeRows.scoreSources,
        submittedAt: gradeRows.submittedAt,
        createdAt: gradeRows.createdAt,
        updatedAt: gradeRows.updatedAt,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(gradeRows)
      .leftJoin(students, eq(students.id, gradeRows.studentId))
      .where(eq(gradeRows.gradebookId, gradebookId));
  }
}
