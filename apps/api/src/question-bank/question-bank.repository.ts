import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { questionBankItems, questionBankVersions } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type QuestionInput = {
  code: string;
  subjectId?: string;
  tags: string[];
  type: "single_choice" | "multiple_choice" | "true_false" | "short_answer";
  prompt: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
};

@Injectable()
export class QuestionBankRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(schoolId: string, input: QuestionInput, userId: string) {
    const [item] = await this.database.db.insert(questionBankItems).values({ schoolId, code: input.code, subjectId: input.subjectId, tags: input.tags, createdByUserId: userId }).returning();
    if (!item) throw new ConflictException("Question could not be created");
    const [version] = await this.database.db.insert(questionBankVersions).values({ questionId: item.id, version: 1, type: input.type, prompt: input.prompt, options: input.options, correctAnswer: input.correctAnswer, explanation: input.explanation, points: input.points, createdByUserId: userId }).returning();
    return { ...item, versions: version ? [version] : [] };
  }

  async list(schoolId: string, status?: string) {
    const items = await this.database.db.select().from(questionBankItems).where(and(eq(questionBankItems.schoolId, schoolId), status ? eq(questionBankItems.status, status) : undefined)).orderBy(desc(questionBankItems.createdAt));
    return Promise.all(items.map(async (item) => ({ ...item, versions: await this.database.db.select().from(questionBankVersions).where(eq(questionBankVersions.questionId, item.id)).orderBy(desc(questionBankVersions.version)) })));
  }

  async find(schoolId: string, id: string) {
    const [item] = await this.database.db.select().from(questionBankItems).where(and(eq(questionBankItems.schoolId, schoolId), eq(questionBankItems.id, id))).limit(1);
    if (!item) throw new NotFoundException("Question not found");
    const versions = await this.database.db.select().from(questionBankVersions).where(eq(questionBankVersions.questionId, id)).orderBy(desc(questionBankVersions.version));
    return { ...item, versions };
  }

  async addVersion(schoolId: string, questionId: string, input: Omit<QuestionInput, "code" | "subjectId" | "tags">, userId: string) {
    const item = await this.find(schoolId, questionId);
    if (item.status === "retired") throw new ConflictException("Retired questions cannot receive new versions");
    const nextVersion = (item.versions[0]?.version ?? 0) + 1;
    const [version] = await this.database.db.insert(questionBankVersions).values({ questionId, version: nextVersion, type: input.type, prompt: input.prompt, options: input.options, correctAnswer: input.correctAnswer, explanation: input.explanation, points: input.points, createdByUserId: userId }).returning();
    return version;
  }

  async review(schoolId: string, questionId: string, versionId: string, userId: string) {
    const item = await this.find(schoolId, questionId);
    if (item.status === "retired") throw new ConflictException("Retired questions cannot be reviewed");
    const [version] = await this.database.db.update(questionBankVersions).set({ status: "reviewed", reviewedByUserId: userId, reviewedAt: new Date() }).where(and(eq(questionBankVersions.id, versionId), eq(questionBankVersions.questionId, questionId), eq(questionBankVersions.status, "draft"))).returning();
    if (!version) throw new ConflictException("Only a draft version can be reviewed");
    const [updated] = await this.database.db.update(questionBankItems).set({ status: "reviewed", updatedAt: new Date() }).where(and(eq(questionBankItems.schoolId, schoolId), eq(questionBankItems.id, questionId))).returning();
    if (!updated) throw new NotFoundException("Question not found");
    return version;
  }

  async retire(schoolId: string, questionId: string, userId: string) {
    const [item] = await this.database.db.update(questionBankItems).set({ status: "retired", retiredAt: new Date(), retiredByUserId: userId, updatedAt: new Date() }).where(and(eq(questionBankItems.schoolId, schoolId), eq(questionBankItems.id, questionId), eq(questionBankItems.status, "reviewed"))).returning();
    if (!item) throw new ConflictException("Only a reviewed question can be retired");
    return item;
  }
}
