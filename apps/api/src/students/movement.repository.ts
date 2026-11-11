import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { studentMovements, students } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type CreateMovement = {
  schoolId: string;
  studentId: string;
  sessionId: string;
  decision: "promote" | "retain" | "graduate";
  fromClassId?: string;
  fromArmId?: string;
  toClassId?: string;
  toArmId?: string;
  effectiveDate: Date;
  reason: string;
  decidedByUserId: string;
};

@Injectable()
export class MovementRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(schoolId: string, sessionId?: string) {
    const conditions = [eq(studentMovements.schoolId, schoolId)];
    if (sessionId) conditions.push(eq(studentMovements.sessionId, sessionId));
    return this.database.db
      .select({ movement: studentMovements, student: students })
      .from(studentMovements)
      .innerJoin(students, eq(students.id, studentMovements.studentId))
      .where(and(...conditions))
      .orderBy(asc(studentMovements.createdAt));
  }

  async find(schoolId: string, studentId: string, sessionId: string) {
    return (await this.database.db
      .select()
      .from(studentMovements)
      .where(and(
        eq(studentMovements.schoolId, schoolId),
        eq(studentMovements.studentId, studentId),
        eq(studentMovements.sessionId, sessionId),
      ))
      .limit(1))[0];
  }

  async create(input: CreateMovement) {
    return (await this.database.db.insert(studentMovements).values(input).returning())[0]!;
  }
}
