import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { schoolSetup, schools } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

@Injectable()
export class SchoolRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async find(schoolId: string) {
    const [school] = await this.database.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    if (!school) return undefined;
    const [setup] = await this.database.db.select().from(schoolSetup).where(eq(schoolSetup.schoolId, schoolId)).limit(1);
    return { ...school, setup: setup ?? null };
  }

  async save(schoolId: string, userId: string, input: Partial<typeof schoolSetup.$inferInsert>) {
    await this.database.db.insert(schoolSetup).values({ schoolId, updatedByUserId: userId, ...input })
      .onConflictDoUpdate({ target: schoolSetup.schoolId, set: { ...input, updatedByUserId: userId, updatedAt: new Date() } });
    const [school] = await this.database.db.select().from(schools).where(eq(schools.id, schoolId)).limit(1);
    const [setup] = await this.database.db.select().from(schoolSetup).where(eq(schoolSetup.schoolId, schoolId)).limit(1);
    return { ...school, setup };
  }

  async listAll() {
    return this.database.db.select().from(schools).orderBy(schools.createdAt);
  }

  async setStatus(schoolId: string, status: "active" | "suspended" | "archived") {
    const [school] = await this.database.db.update(schools).set({ status, updatedAt: new Date() }).where(eq(schools.id, schoolId)).returning();
    return school;
  }
}