import { and, eq, isNull } from "drizzle-orm";
import { Inject, Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { gradebookSubmissions, gradeSnapshots, gradeRows, students } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export interface SubmissionStatus {
  status: "draft" | "submitted" | "modificationRequested" | "approved" | "published";
  submittedAt?: Date;
  submittedByUserId?: string;
  reviewedAt?: Date;
  reviewedByUserId?: string;
  reviewFeedback?: unknown;
  publishedAt?: Date;
  publishedByUserId?: string;
}

@Injectable()
export class PublicationRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async getOrCreateSubmission(gradebookId: string) {
    const existing = await this.database.db
      .select()
      .from(gradebookSubmissions)
      .where(eq(gradebookSubmissions.gradebookId, gradebookId))
      .limit(1);

    if (existing.length > 0) return existing[0];

    return (
      await this.database.db
        .insert(gradebookSubmissions)
        .values({ gradebookId, status: "draft" })
        .returning()
    )[0];
  }

  async getSubmission(gradebookId: string) {
    return (
      await this.database.db
        .select()
        .from(gradebookSubmissions)
        .where(eq(gradebookSubmissions.gradebookId, gradebookId))
        .limit(1)
    )[0];
  }

  async submitGradebook(gradebookId: string, userId: string) {
    const submission = await this.getOrCreateSubmission(gradebookId);

    if (submission.status === "published") {
      throw new ConflictException("Cannot submit a published gradebook");
    }

    return (
      await this.database.db
        .update(gradebookSubmissions)
        .set({
          status: "submitted",
          submittedAt: new Date(),
          submittedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(gradebookSubmissions.id, submission.id))
        .returning()
    )[0];
  }

  async requestModification(gradebookId: string, userId: string, feedback: unknown) {
    const submission = await this.getSubmission(gradebookId);
    if (!submission) throw new NotFoundException("Submission not found");
    if (submission.status !== "submitted") {
      throw new ConflictException("Can only request modifications on submitted gradebooks");
    }

    return (
      await this.database.db
        .update(gradebookSubmissions)
        .set({
          status: "modificationRequested",
          reviewedAt: new Date(),
          reviewedByUserId: userId,
          reviewFeedback: feedback,
          updatedAt: new Date(),
        })
        .where(eq(gradebookSubmissions.id, submission.id))
        .returning()
    )[0];
  }

  async approveGradebook(gradebookId: string, userId: string) {
    const submission = await this.getSubmission(gradebookId);
    if (!submission) throw new NotFoundException("Submission not found");
    if (submission.status !== "submitted") {
      throw new ConflictException("Can only approve submitted gradebooks");
    }

    return (
      await this.database.db
        .update(gradebookSubmissions)
        .set({
          status: "approved",
          reviewedAt: new Date(),
          reviewedByUserId: userId,
          reviewFeedback: null,
          updatedAt: new Date(),
        })
        .where(eq(gradebookSubmissions.id, submission.id))
        .returning()
    )[0];
  }

  async publishGradebook(gradebookId: string, userId: string) {
    return this.database.db.transaction(async (transaction) => {
      const submission = (await transaction
        .select()
        .from(gradebookSubmissions)
        .where(eq(gradebookSubmissions.gradebookId, gradebookId))
        .limit(1))[0];
      if (!submission) throw new NotFoundException("Submission not found");
      if (submission.status !== "approved") throw new ConflictException("Can only publish approved gradebooks");

      const allGrades = await transaction.select().from(gradeRows).where(eq(gradeRows.gradebookId, gradebookId));
      await transaction.insert(gradeSnapshots).values(allGrades.map((grade) => ({
        gradebookSubmissionId: submission.id,
        studentId: grade.studentId,
        scores: grade.scores,
      })));

      const published = (await transaction
        .update(gradebookSubmissions)
        .set({ status: "published", publishedAt: new Date(), publishedByUserId: userId, updatedAt: new Date() })
        .where(and(eq(gradebookSubmissions.id, submission.id), eq(gradebookSubmissions.status, "approved")))
        .returning())[0];
      if (!published) throw new ConflictException("Gradebook publication changed by another request");
      return published;
    });
  }

  async getPublishedSnapshot(gradebookId: string) {
    const submission = await this.getSubmission(gradebookId);
    if (!submission || submission.status !== "published") {
      return null;
    }

    const snapshots = await this.database.db
      .select({
        id: gradeSnapshots.id,
        studentId: gradeSnapshots.studentId,
        scores: gradeSnapshots.scores,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
      })
      .from(gradeSnapshots)
      .leftJoin(students, eq(students.id, gradeSnapshots.studentId))
      .where(eq(gradeSnapshots.gradebookSubmissionId, submission.id));

    return {
      submissionId: submission.id,
      publishedAt: submission.publishedAt,
      publishedByUserId: submission.publishedByUserId,
      snapshots,
    };
  }

  async isPublished(gradebookId: string) {
    const submission = await this.getSubmission(gradebookId);
    return submission?.status === "published";
  }
}
