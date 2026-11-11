import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, gte, gt, isNull, lte, or } from "drizzle-orm";
import {
  academicArms,
  academicClasses,
  academicSessions,
  academicSubjects,
  academicTerms,
  schoolMemberships,
  teacherClassAssignments,
  teacherSubjectAssignments,
  users,
} from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type AssignmentInput = {
  type: "class" | "subject";
  teacherUserId: string;
  classId: string;
  armId?: string;
  subjectId?: string;
  sessionId: string;
  termId?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
};

@Injectable()
export class AssignmentRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async list(schoolId: string, filters: { type?: AssignmentInput["type"]; teacherUserId?: string; sessionId?: string; termId?: string }) {
    const classRows = filters.type === "subject" ? [] : await this.database.db.select().from(teacherClassAssignments).where(and(eq(teacherClassAssignments.schoolId, schoolId), filters.teacherUserId ? eq(teacherClassAssignments.teacherUserId, filters.teacherUserId) : undefined, filters.sessionId ? eq(teacherClassAssignments.sessionId, filters.sessionId) : undefined, filters.termId ? eq(teacherClassAssignments.termId, filters.termId) : undefined));
    const subjectRows = filters.type === "class" ? [] : await this.database.db.select().from(teacherSubjectAssignments).where(and(eq(teacherSubjectAssignments.schoolId, schoolId), filters.teacherUserId ? eq(teacherSubjectAssignments.teacherUserId, filters.teacherUserId) : undefined, filters.sessionId ? eq(teacherSubjectAssignments.sessionId, filters.sessionId) : undefined, filters.termId ? eq(teacherSubjectAssignments.termId, filters.termId) : undefined));
    return { classAssignments: classRows, subjectAssignments: subjectRows };
  }

  async create(schoolId: string, input: AssignmentInput) {
    if (input.effectiveTo && input.effectiveTo <= input.effectiveFrom) throw new ConflictException("The assignment end date must be after its start date");
    return this.database.db.transaction(async (tx) => {
      const [teacher] = await tx.select({ id: users.id }).from(users).innerJoin(schoolMemberships, eq(schoolMemberships.userId, users.id)).where(and(eq(users.id, input.teacherUserId), eq(users.status, "active"), eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.status, "active"))).limit(1);
      if (!teacher) throw new NotFoundException("Active teacher membership was not found");
      const [academicClass] = await tx.select({ id: academicClasses.id }).from(academicClasses).where(and(eq(academicClasses.id, input.classId), eq(academicClasses.schoolId, schoolId))).limit(1);
      if (!academicClass) throw new NotFoundException("Class was not found in this school");
      if (input.armId) {
        const [arm] = await tx.select({ id: academicArms.id }).from(academicArms).where(and(eq(academicArms.id, input.armId), eq(academicArms.classId, input.classId))).limit(1);
        if (!arm) throw new ConflictException("The class arm does not belong to the selected class");
      }
      const [session] = await tx.select({ id: academicSessions.id }).from(academicSessions).where(and(eq(academicSessions.id, input.sessionId), eq(academicSessions.schoolId, schoolId))).limit(1);
      if (!session) throw new NotFoundException("Academic session was not found in this school");
      if (input.termId) {
        const [term] = await tx.select({ id: academicTerms.id }).from(academicTerms).where(and(eq(academicTerms.id, input.termId), eq(academicTerms.sessionId, input.sessionId))).limit(1);
        if (!term) throw new ConflictException("The term does not belong to the selected session");
      }
      if (input.type === "subject") {
        if (!input.subjectId) throw new ConflictException("A subject is required for a subject assignment");
        const [subject] = await tx.select({ id: academicSubjects.id }).from(academicSubjects).where(and(eq(academicSubjects.id, input.subjectId), eq(academicSubjects.schoolId, schoolId))).limit(1);
        if (!subject) throw new NotFoundException("Subject was not found in this school");
        const overlap = await tx.select({ id: teacherSubjectAssignments.id }).from(teacherSubjectAssignments).where(and(eq(teacherSubjectAssignments.schoolId, schoolId), eq(teacherSubjectAssignments.subjectId, input.subjectId), eq(teacherSubjectAssignments.classId, input.classId), input.armId ? eq(teacherSubjectAssignments.armId, input.armId) : isNull(teacherSubjectAssignments.armId), eq(teacherSubjectAssignments.sessionId, input.sessionId), input.termId ? eq(teacherSubjectAssignments.termId, input.termId) : isNull(teacherSubjectAssignments.termId), eq(teacherSubjectAssignments.status, "active"), lte(teacherSubjectAssignments.effectiveFrom, input.effectiveTo ?? new Date("9999-12-31")), or(isNull(teacherSubjectAssignments.effectiveTo), gte(teacherSubjectAssignments.effectiveTo, input.effectiveFrom)))).limit(1);
        if (overlap.length) throw new ConflictException("That subject assignment overlaps an existing active assignment");
        const [created] = await tx.insert(teacherSubjectAssignments).values({ schoolId, teacherUserId: input.teacherUserId, subjectId: input.subjectId, classId: input.classId, armId: input.armId, sessionId: input.sessionId, termId: input.termId, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo }).returning();
        return { type: "subject" as const, ...created };
      }
      if (!input.armId) throw new ConflictException("A class arm is required for a class assignment");
      const overlap = await tx.select({ id: teacherClassAssignments.id }).from(teacherClassAssignments).where(and(eq(teacherClassAssignments.schoolId, schoolId), eq(teacherClassAssignments.classId, input.classId), eq(teacherClassAssignments.armId, input.armId), eq(teacherClassAssignments.sessionId, input.sessionId), input.termId ? eq(teacherClassAssignments.termId, input.termId) : isNull(teacherClassAssignments.termId), eq(teacherClassAssignments.status, "active"), lte(teacherClassAssignments.effectiveFrom, input.effectiveTo ?? new Date("9999-12-31")), or(isNull(teacherClassAssignments.effectiveTo), gte(teacherClassAssignments.effectiveTo, input.effectiveFrom)))).limit(1);
      if (overlap.length) throw new ConflictException("That class assignment overlaps an existing active assignment");
      const [created] = await tx.insert(teacherClassAssignments).values({ schoolId, teacherUserId: input.teacherUserId, classId: input.classId, armId: input.armId, sessionId: input.sessionId, termId: input.termId, effectiveFrom: input.effectiveFrom, effectiveTo: input.effectiveTo }).returning();
      return { type: "class" as const, ...created };
    });
  }

  async close(schoolId: string, type: AssignmentInput["type"], id: string, effectiveTo: Date) {
    const table = type === "class" ? teacherClassAssignments : teacherSubjectAssignments;
    const [existing] = await this.database.db.select().from(table).where(and(eq(table.id, id), eq(table.schoolId, schoolId), eq(table.status, "active"))).limit(1);
    if (!existing) throw new NotFoundException("Active assignment was not found");
    if (effectiveTo < existing.effectiveFrom) throw new ConflictException("The close date cannot be before the assignment start date");
    const [closed] = await this.database.db.update(table).set({ status: "ended", effectiveTo }).where(eq(table.id, id)).returning();
    return { type, ...closed };
  }
}
