import { Inject, Injectable } from "@nestjs/common";
import { asc, and, eq, exists, gte, lte, or, sql, isNull } from "drizzle-orm";
import { studentGuardians, students, teacherClassAssignments, teacherSubjectAssignments } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type CreateStudentRecord = {
  schoolId: string;
  admissionNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  nationality?: string;
  classId?: string;
  armId?: string;
  session?: string;
  createdByUserId: string;
};

export type UpdateStudentRecord = Partial<
  Pick<
    CreateStudentRecord,
    | "firstName"
    | "middleName"
    | "lastName"
    | "dateOfBirth"
    | "gender"
    | "nationality"
    | "classId"
    | "armId"
    | "session"
  >
> & {
  status?: "pending" | "approved" | "rejected" | "transferred" | "withdrawn" | "graduated";
  admittedAt?: Date;
  withdrawnAt?: Date;
  updatedByUserId: string;
};

@Injectable()
export class StudentRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listBySchool(schoolId: string) {
    return this.database.db
      .select()
      .from(students)
      .where(eq(students.schoolId, schoolId))
      .orderBy(asc(students.lastName), asc(students.firstName));
  }

  private teacherScope(schoolId: string, teacherUserId: string) {
    const today = new Date();
    return or(
      exists(this.database.db.select({ id: teacherClassAssignments.id }).from(teacherClassAssignments).where(and(
        eq(teacherClassAssignments.schoolId, schoolId),
        eq(teacherClassAssignments.teacherUserId, teacherUserId),
        eq(teacherClassAssignments.status, "active"),
        sql`${students.classId} = ${teacherClassAssignments.classId}::text`,
        sql`${students.armId} = ${teacherClassAssignments.armId}::text`,
        lte(teacherClassAssignments.effectiveFrom, today),
        or(isNull(teacherClassAssignments.effectiveTo), gte(teacherClassAssignments.effectiveTo, today)),
      ))),
      exists(this.database.db.select({ id: teacherSubjectAssignments.id }).from(teacherSubjectAssignments).where(and(
        eq(teacherSubjectAssignments.schoolId, schoolId),
        eq(teacherSubjectAssignments.teacherUserId, teacherUserId),
        eq(teacherSubjectAssignments.status, "active"),
        sql`${students.classId} = ${teacherSubjectAssignments.classId}::text`,
        or(isNull(teacherSubjectAssignments.armId), sql`${students.armId} = ${teacherSubjectAssignments.armId}::text`),
        lte(teacherSubjectAssignments.effectiveFrom, today),
        or(isNull(teacherSubjectAssignments.effectiveTo), gte(teacherSubjectAssignments.effectiveTo, today)),
      ))),
    );
  }

  async listByTeacherScope(schoolId: string, teacherUserId: string) {
    return this.database.db.select().from(students).where(and(eq(students.schoolId, schoolId), this.teacherScope(schoolId, teacherUserId))).orderBy(asc(students.lastName), asc(students.firstName));
  }

  async findById(schoolId: string, studentId: string) {
    const [student] = await this.database.db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.id, studentId)))
      .limit(1);
    if (!student) return undefined;

    const guardians = await this.database.db
      .select()
      .from(studentGuardians)
      .where(
        and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)),
      );
    return { ...student, guardians };
  }

  async findByUserId(schoolId: string, userId: string) {
    const [student] = await this.database.db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.userId, userId)))
      .limit(1);
    return student;
  }

  async findByTeacherScope(schoolId: string, teacherUserId: string, studentId: string) {
    const [student] = await this.database.db.select().from(students).where(and(eq(students.schoolId, schoolId), eq(students.id, studentId), this.teacherScope(schoolId, teacherUserId))).limit(1);
    if (!student) return undefined;
    const guardians = await this.database.db.select().from(studentGuardians).where(and(eq(studentGuardians.schoolId, schoolId), eq(studentGuardians.studentId, studentId)));
    return { ...student, guardians };
  }

  async create(input: CreateStudentRecord) {
    const [student] = await this.database.db
      .insert(students)
      .values({ ...input, admissionNo: input.admissionNo.trim() })
      .returning();
    return student;
  }

  async createMany(schoolId: string, createdByUserId: string, records: Array<Omit<CreateStudentRecord, "schoolId" | "createdByUserId">>) {
    return this.database.db.transaction(async (transaction) =>
      transaction.insert(students).values(records.map((record) => ({ ...record, schoolId, createdByUserId, admissionNo: record.admissionNo.trim() }))).returning(),
    );
  }

  async update(schoolId: string, studentId: string, input: UpdateStudentRecord) {
    const [student] = await this.database.db
      .update(students)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(students.schoolId, schoolId), eq(students.id, studentId)))
      .returning();
    return student;
  }
}