import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { academicSessions, cbtPoolQuestions, cbtPools, examCandidates, examConfigurations, students } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type ExamInput = { poolId: string; sessionId: string; code: string; name: string; opensAt: Date; closesAt: Date; questionsPerStudent: number; gradebookId?: string; gradeComponentKey?: string };

@Injectable()
export class ExamRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(schoolId: string, input: ExamInput, userId: string) {
    if (input.closesAt <= input.opensAt) throw new ConflictException("Exam close time must be after open time");
    if (!Number.isInteger(input.questionsPerStudent) || input.questionsPerStudent < 1) throw new ConflictException("At least one question per student is required");
    if ((input.gradebookId && !input.gradeComponentKey) || (!input.gradebookId && input.gradeComponentKey)) throw new ConflictException("Gradebook mapping requires both gradebookId and gradeComponentKey");
    const [pool] = await this.database.db.select().from(cbtPools).where(and(eq(cbtPools.id, input.poolId), eq(cbtPools.schoolId, schoolId))).limit(1);
    if (!pool || pool.status !== "published") throw new ConflictException("Only a published CBT pool can be configured");
    const [session] = await this.database.db.select().from(academicSessions).where(and(eq(academicSessions.id, input.sessionId), eq(academicSessions.schoolId, schoolId))).limit(1);
    if (!session) throw new ConflictException("Academic session is outside the school");
    const [configuration] = await this.database.db.insert(examConfigurations).values({ schoolId, ...input, createdByUserId: userId }).returning();
    if (!configuration) throw new ConflictException("Exam configuration could not be created");
    return configuration;
  }

  async list(schoolId: string) {
    return this.database.db.select().from(examConfigurations).where(eq(examConfigurations.schoolId, schoolId)).orderBy(asc(examConfigurations.opensAt));
  }

  async find(schoolId: string, id: string) {
    const [configuration] = await this.database.db.select().from(examConfigurations).where(and(eq(examConfigurations.id, id), eq(examConfigurations.schoolId, schoolId))).limit(1);
    if (!configuration) throw new NotFoundException("Exam configuration not found");
    const candidates = await this.database.db.select().from(examCandidates).where(eq(examCandidates.configurationId, id)).orderBy(asc(examCandidates.createdAt));
    return { ...configuration, candidates };
  }

  async snapshotCandidates(schoolId: string, configurationId: string, studentIds: string[], userId: string) {
    const configuration = await this.find(schoolId, configurationId);
    if (configuration.status !== "draft") throw new ConflictException("Only draft exams can be snapshotted");
    const uniqueStudentIds = [...new Set(studentIds)];
    if (!uniqueStudentIds.length) throw new ConflictException("At least one candidate is required");
    const rows = await this.database.db.select().from(students).where(and(eq(students.schoolId, schoolId), inArray(students.id, uniqueStudentIds)));
    if (rows.length !== uniqueStudentIds.length) throw new ConflictException("Every candidate must belong to the school");
    const [pool] = await this.database.db.select().from(cbtPools).where(and(eq(cbtPools.id, configuration.poolId), eq(cbtPools.schoolId, schoolId))).limit(1);
    if (!pool) throw new ConflictException("CBT pool not found");
    const poolQuestions = await this.database.db.select({ id: cbtPoolQuestions.id }).from(cbtPoolQuestions).where(eq(cbtPoolQuestions.poolId, pool.id));
    if (poolQuestions.length < configuration.questionsPerStudent * uniqueStudentIds.length) {
      throw new ConflictException("The published pool does not contain enough distinct questions for every candidate");
    }
    await this.database.db.transaction(async (tx) => {
      await tx.delete(examCandidates).where(eq(examCandidates.configurationId, configurationId));
      await tx.insert(examCandidates).values(rows.map((student) => ({
        configurationId,
        studentId: student.id,
        snapshot: {
          studentId: student.id,
          admissionNo: student.admissionNo,
          firstName: student.firstName,
          lastName: student.lastName,
          classId: student.classId,
          armId: student.armId,
          status: student.status,
        },
      })));
      const [published] = await tx.update(examConfigurations)
        .set({ status: "published", snapshotAt: new Date(), publishedByUserId: userId, updatedAt: new Date() })
        .where(and(eq(examConfigurations.id, configurationId), eq(examConfigurations.status, "draft")))
        .returning();
      if (!published) throw new ConflictException("Exam configuration was changed by another request");
    });
    return this.find(schoolId, configurationId);
  }
}
