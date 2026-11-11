import { Inject, Injectable } from "@nestjs/common";
import { and, eq, inArray, or, isNull, gte, lte } from "drizzle-orm";
import {
  attendanceRecords,
  academicClasses,
  academicArms,
  academicSessions,
  academicTerms,
  teacherClassAssignments,
} from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

@Injectable()
export class TeacherDashboardRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async findPendingAttendance(schoolId: string, teacherUserId: string) {
    const today = new Date();

    // Get teacher's active class assignments
    const assignments = await this.database.db
      .select({
        classId: teacherClassAssignments.classId,
        armId: teacherClassAssignments.armId,
      })
      .from(teacherClassAssignments)
      .where(
        and(
          eq(teacherClassAssignments.schoolId, schoolId),
          eq(teacherClassAssignments.teacherUserId, teacherUserId),
          eq(teacherClassAssignments.status, "active"),
          lte(teacherClassAssignments.effectiveFrom, today),
          or(isNull(teacherClassAssignments.effectiveTo), gte(teacherClassAssignments.effectiveTo, today))
        )
      );

    if (assignments.length === 0) {
      return [];
    }

    // Get pending attendance for those classes
    const classArmPairs = assignments.map((a: { classId: string; armId: string }) => ({ classId: a.classId, armId: a.armId }));

    const pendingRecords = await this.database.db
      .select({
        id: attendanceRecords.id,
        classId: attendanceRecords.classId,
        armId: attendanceRecords.armId,
        sessionId: attendanceRecords.sessionId,
        termId: attendanceRecords.termId,
        attendanceDate: attendanceRecords.attendanceDate,
        status: attendanceRecords.status,
        className: academicClasses.name,
        armName: academicArms.name,
        sessionName: academicSessions.name,
        termName: academicTerms.name,
        createdAt: attendanceRecords.createdAt,
      })
      .from(attendanceRecords)
      .innerJoin(academicClasses, eq(academicClasses.id, attendanceRecords.classId))
      .innerJoin(academicArms, eq(academicArms.id, attendanceRecords.armId))
      .innerJoin(academicSessions, eq(academicSessions.id, attendanceRecords.sessionId))
      .leftJoin(academicTerms, eq(academicTerms.id, attendanceRecords.termId))
      .where(
        and(
          eq(attendanceRecords.schoolId, schoolId),
          // Status: draft (pending teacher submission) or returned (needs resubmission)
          or(eq(attendanceRecords.status, "draft"), eq(attendanceRecords.status, "returned")),
          // Filter by teacher's assigned classes
          or(
            ...classArmPairs.map((pair: { classId: string; armId: string }) =>
              and(eq(attendanceRecords.classId, pair.classId), eq(attendanceRecords.armId, pair.armId))
            )
          )
        )
      );

    return pendingRecords;
  }
}
