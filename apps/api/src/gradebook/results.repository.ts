import { Injectable } from "@nestjs/common";
import { eq, and } from "drizzle-orm";
import { gradeSnapshots, gradebookSubmissions, gradebooks, academicClasses, academicArms, academicSessions, academicTerms, academicSubjects } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export interface PublishedResult {
  snapshotId: string;
  studentId: string;
  scores: Record<string, number>;
  publishedAt: Date;
  publishedByUserId: string | null;
  submissionId: string;
  submissionStatus: string;
  classId: string;
  armId: string;
  sessionId: string;
  termId: string | null;
  subjectId: string | null;
  componentPolicy: Array<{ name: string; weight: number }>;
  className: string;
  armName: string;
  sessionName: string;
  termName: string | null;
  subjectName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ResultsRepository {
  constructor(private database: DatabaseService) {}

  /**
   * Get all published results for a student
   * Joins snapshots → submissions → gradebooks → classes/arms/sessions/terms/subjects
   */
  async getStudentResults(studentId: string): Promise<PublishedResult[]> {
    const results = await this.database.db
      .select({
        snapshotId: gradeSnapshots.id,
        studentId: gradeSnapshots.studentId,
        scores: gradeSnapshots.scores,
        publishedAt: gradebookSubmissions.publishedAt,
        publishedByUserId: gradebookSubmissions.publishedByUserId,
        submissionId: gradebookSubmissions.id,
        submissionStatus: gradebookSubmissions.status,
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
        subjectName: academicSubjects.name,
        createdAt: gradeSnapshots.createdAt,
        updatedAt: gradebooks.updatedAt,
      })
      .from(gradeSnapshots)
      .innerJoin(
        gradebookSubmissions,
        eq(gradeSnapshots.gradebookSubmissionId, gradebookSubmissions.id)
      )
      .innerJoin(
        gradebooks,
        eq(gradebookSubmissions.gradebookId, gradebooks.id)
      )
      .leftJoin(academicClasses, eq(gradebooks.classId, academicClasses.id))
      .leftJoin(academicArms, eq(gradebooks.armId, academicArms.id))
      .leftJoin(academicSessions, eq(gradebooks.sessionId, academicSessions.id))
      .leftJoin(academicTerms, eq(gradebooks.termId, academicTerms.id))
      .leftJoin(academicSubjects, eq(gradebooks.subjectId, academicSubjects.id))
      .where(and(eq(gradeSnapshots.studentId, studentId), eq(gradebookSubmissions.status, "published")));

    return results as PublishedResult[];
  }

  /**
   * Verify a published result by snapshot ID
   * Returns full publication proof (submission + snapshot metadata)
   */
  async verifyResult(snapshotId: string, studentId: string): Promise<{
    snapshot: typeof gradeSnapshots.$inferSelect;
    submission: typeof gradebookSubmissions.$inferSelect;
  } | null> {
    const result = await this.database.db
      .select({
        snapshot: gradeSnapshots,
        submission: gradebookSubmissions,
      })
      .from(gradeSnapshots)
      .innerJoin(
        gradebookSubmissions,
        eq(gradeSnapshots.gradebookSubmissionId, gradebookSubmissions.id)
      )
      .where(
        and(
          eq(gradeSnapshots.id, snapshotId),
          eq(gradeSnapshots.studentId, studentId),
          eq(gradebookSubmissions.status, "published")
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    return {
      snapshot: result[0].snapshot,
      submission: result[0].submission,
    };
  }
}
