import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, lte, or, isNull, sql } from "drizzle-orm";
import {
  academicArms,
  academicClasses,
  academicSessions,
  academicSubjects,
  academicTerms,
  teacherClassAssignments,
  teacherSubjectAssignments,
} from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

@Injectable()
export class AcademicRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listSessions(schoolId: string) { return this.database.db.select().from(academicSessions).where(eq(academicSessions.schoolId, schoolId)); }
  async findSession(schoolId: string, id: string) { return (await this.database.db.select().from(academicSessions).where(and(eq(academicSessions.schoolId, schoolId), eq(academicSessions.id, id))).limit(1))[0]; }
  async createSession(schoolId: string, input: { name: string; status: string }) { return (await this.database.db.insert(academicSessions).values({ schoolId, ...input }).returning())[0]!; }
  async updateSession(schoolId: string, id: string, input: { name?: string; status?: string }) { return (await this.database.db.update(academicSessions).set({ ...input, updatedAt: new Date() }).where(and(eq(academicSessions.schoolId, schoolId), eq(academicSessions.id, id))).returning())[0]; }
  async deleteSession(schoolId: string, id: string) { await this.assertUnused(academicTerms, academicTerms.sessionId, id, "session"); return (await this.database.db.delete(academicSessions).where(and(eq(academicSessions.schoolId, schoolId), eq(academicSessions.id, id))).returning())[0]; }

  async listTerms(schoolId: string, sessionId: string) { return this.database.db.select().from(academicTerms).innerJoin(academicSessions, eq(academicSessions.id, academicTerms.sessionId)).where(and(eq(academicSessions.schoolId, schoolId), eq(academicTerms.sessionId, sessionId))); }
  async findTerm(schoolId: string, id: string) { return (await this.database.db.select({ term: academicTerms, session: academicSessions }).from(academicTerms).innerJoin(academicSessions, eq(academicSessions.id, academicTerms.sessionId)).where(and(eq(academicSessions.schoolId, schoolId), eq(academicTerms.id, id))).limit(1))[0]; }
  async createTerm(schoolId: string, sessionId: string, input: { name: string; startsAt?: Date; endsAt?: Date }) { const session = await this.findSession(schoolId, sessionId); if (!session) return undefined; return (await this.database.db.insert(academicTerms).values({ sessionId, ...input }).returning())[0]!; }
  async updateTerm(schoolId: string, id: string, input: { name?: string; startsAt?: Date; endsAt?: Date }) { const found = await this.findTerm(schoolId, id); if (!found) return undefined; return (await this.database.db.update(academicTerms).set(input).where(eq(academicTerms.id, id)).returning())[0]; }
  async deleteTerm(schoolId: string, id: string) { const found = await this.findTerm(schoolId, id); if (!found) return undefined; await this.assertUnused(teacherClassAssignments, teacherClassAssignments.termId, id, "term"); return (await this.database.db.delete(academicTerms).where(eq(academicTerms.id, id)).returning())[0]; }

  async listClasses(schoolId: string) { return this.database.db.select().from(academicClasses).where(eq(academicClasses.schoolId, schoolId)); }
  async findClass(schoolId: string, id: string) { return (await this.database.db.select().from(academicClasses).where(and(eq(academicClasses.schoolId, schoolId), eq(academicClasses.id, id))).limit(1))[0]; }
  async createClass(schoolId: string, input: { name: string; section?: string }) { return (await this.database.db.insert(academicClasses).values({ schoolId, ...input }).returning())[0]!; }
  async updateClass(schoolId: string, id: string, input: { name?: string; section?: string }) { return (await this.database.db.update(academicClasses).set(input).where(and(eq(academicClasses.schoolId, schoolId), eq(academicClasses.id, id))).returning())[0]; }
  async deleteClass(schoolId: string, id: string) { await this.assertUnused(academicArms, academicArms.classId, id, "class"); return (await this.database.db.delete(academicClasses).where(and(eq(academicClasses.schoolId, schoolId), eq(academicClasses.id, id))).returning())[0]; }

  async listArms(schoolId: string, classId: string) { return this.database.db.select({ arm: academicArms }).from(academicArms).innerJoin(academicClasses, eq(academicClasses.id, academicArms.classId)).where(and(eq(academicClasses.schoolId, schoolId), eq(academicArms.classId, classId))); }
  async findArm(schoolId: string, id: string) { return (await this.database.db.select({ arm: academicArms, class: academicClasses }).from(academicArms).innerJoin(academicClasses, eq(academicClasses.id, academicArms.classId)).where(and(eq(academicClasses.schoolId, schoolId), eq(academicArms.id, id))).limit(1))[0]; }
  async createArm(schoolId: string, classId: string, name: string) { if (!await this.findClass(schoolId, classId)) return undefined; return (await this.database.db.insert(academicArms).values({ classId, name }).returning())[0]!; }
  async updateArm(schoolId: string, id: string, name: string) { if (!await this.findArm(schoolId, id)) return undefined; return (await this.database.db.update(academicArms).set({ name }).where(eq(academicArms.id, id)).returning())[0]; }
  async deleteArm(schoolId: string, id: string) { const found = await this.findArm(schoolId, id); if (!found) return undefined; await this.assertUnused(teacherClassAssignments, teacherClassAssignments.armId, id, "arm"); return (await this.database.db.delete(academicArms).where(eq(academicArms.id, id)).returning())[0]; }

  async listSubjects(schoolId: string) { return this.database.db.select().from(academicSubjects).where(eq(academicSubjects.schoolId, schoolId)); }
  async findSubject(schoolId: string, id: string) { return (await this.database.db.select().from(academicSubjects).where(and(eq(academicSubjects.schoolId, schoolId), eq(academicSubjects.id, id))).limit(1))[0]; }
  async createSubject(schoolId: string, input: { code: string; name: string }) { return (await this.database.db.insert(academicSubjects).values({ schoolId, code: input.code.toUpperCase(), name: input.name }).returning())[0]!; }
  async updateSubject(schoolId: string, id: string, input: { code?: string; name?: string }) { return (await this.database.db.update(academicSubjects).set({ ...input, code: input.code?.toUpperCase() }).where(and(eq(academicSubjects.schoolId, schoolId), eq(academicSubjects.id, id))).returning())[0]; }
  async deleteSubject(schoolId: string, id: string) { await this.assertUnused(teacherSubjectAssignments, teacherSubjectAssignments.subjectId, id, "subject"); return (await this.database.db.delete(academicSubjects).where(and(eq(academicSubjects.schoolId, schoolId), eq(academicSubjects.id, id))).returning())[0]; }

  private async assertUnused(table: any, column: any, id: string, label: string) { const rows = await this.database.db.select({ id: sql`1` }).from(table).where(eq(column, id)).limit(1); if (rows.length) throw new ConflictException(`Cannot delete ${label} while dependent records exist`); }

  async resolveTeacherScope(schoolId: string, teacherUserId: string, sessionId?: string, termId?: string) {
    const today = new Date();
    const scope = [
      eq(teacherClassAssignments.schoolId, schoolId),
      eq(teacherClassAssignments.teacherUserId, teacherUserId),
      eq(teacherClassAssignments.status, "active"),
      lte(teacherClassAssignments.effectiveFrom, today),
      or(isNull(teacherClassAssignments.effectiveTo), gte(teacherClassAssignments.effectiveTo, today)),
      sessionId ? eq(teacherClassAssignments.sessionId, sessionId) : undefined,
      termId ? eq(teacherClassAssignments.termId, termId) : undefined,
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const classAssignments = await this.database.db
      .select({
        assignmentId: teacherClassAssignments.id,
        sessionId: academicSessions.id,
        sessionName: academicSessions.name,
        termId: academicTerms.id,
        termName: academicTerms.name,
        classId: academicClasses.id,
        className: academicClasses.name,
        armId: academicArms.id,
        armName: academicArms.name,
      })
      .from(teacherClassAssignments)
      .innerJoin(academicSessions, eq(academicSessions.id, teacherClassAssignments.sessionId))
      .leftJoin(academicTerms, eq(academicTerms.id, teacherClassAssignments.termId))
      .innerJoin(academicClasses, eq(academicClasses.id, teacherClassAssignments.classId))
      .innerJoin(academicArms, eq(academicArms.id, teacherClassAssignments.armId))
      .where(and(...scope));

    const subjectScope = [
      eq(teacherSubjectAssignments.schoolId, schoolId),
      eq(teacherSubjectAssignments.teacherUserId, teacherUserId),
      eq(teacherSubjectAssignments.status, "active"),
      lte(teacherSubjectAssignments.effectiveFrom, today),
      or(isNull(teacherSubjectAssignments.effectiveTo), gte(teacherSubjectAssignments.effectiveTo, today)),
      sessionId ? eq(teacherSubjectAssignments.sessionId, sessionId) : undefined,
      termId ? eq(teacherSubjectAssignments.termId, termId) : undefined,
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
    const subjectAssignments = await this.database.db
      .select({
        assignmentId: teacherSubjectAssignments.id,
        sessionId: academicSessions.id,
        sessionName: academicSessions.name,
        termId: academicTerms.id,
        termName: academicTerms.name,
        classId: academicClasses.id,
        className: academicClasses.name,
        armId: academicArms.id,
        armName: academicArms.name,
        subjectId: academicSubjects.id,
        subjectCode: academicSubjects.code,
        subjectName: academicSubjects.name,
      })
      .from(teacherSubjectAssignments)
      .innerJoin(academicSessions, eq(academicSessions.id, teacherSubjectAssignments.sessionId))
      .leftJoin(academicTerms, eq(academicTerms.id, teacherSubjectAssignments.termId))
      .innerJoin(academicClasses, eq(academicClasses.id, teacherSubjectAssignments.classId))
      .leftJoin(academicArms, eq(academicArms.id, teacherSubjectAssignments.armId))
      .innerJoin(academicSubjects, eq(academicSubjects.id, teacherSubjectAssignments.subjectId))
      .where(and(...subjectScope));

    return { classAssignments, subjectAssignments };
  }
}
