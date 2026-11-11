import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { attendanceExceptions, attendanceRecords, attendanceSyncOperations } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export type AttendanceEntry = { studentId: string; status: "present" | "absent" | "late" | "excused"; note?: string };
export type AttendanceInput = { classId: string; armId: string; sessionId: string; termId: string; attendanceDate: Date; entries: AttendanceEntry[] };
export type AttendanceSyncOperation = typeof attendanceSyncOperations.$inferSelect;

@Injectable()
export class AttendanceRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async create(schoolId: string, input: AttendanceInput, userId: string, idempotencyKey?: string, requestFingerprint?: string) {
    if (idempotencyKey) {
      const existing = await this.database.db.select().from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.idempotencyKey, idempotencyKey))).limit(1);
      if (existing[0]) {
        if (existing[0].requestFingerprint !== requestFingerprint) throw new ConflictException("The idempotency key was already used for a different attendance record");
        return { record: existing[0], created: false };
      }

    }
    const inserted = await this.database.db.insert(attendanceRecords).values({ schoolId, ...input, submittedByUserId: userId, idempotencyKey, requestFingerprint }).onConflictDoNothing({ target: [attendanceRecords.schoolId, attendanceRecords.idempotencyKey] }).returning();
    if (inserted[0]) return { record: inserted[0], created: true };
    const [record] = await this.database.db.select().from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.idempotencyKey, idempotencyKey!))).limit(1);
    if (!record || record.requestFingerprint !== requestFingerprint) throw new ConflictException("The idempotency key was already used for a different attendance record");
    return { record, created: false };
  }

  async recordSyncOperation(schoolId: string, operationId: string, payload: AttendanceInput, requestFingerprint: string, userId: string) {
    const [operation] = await this.database.db
      .insert(attendanceSyncOperations)
      .values({ schoolId, operationId, payload, requestFingerprint, createdByUserId: userId })
      .onConflictDoNothing({ target: [attendanceSyncOperations.schoolId, attendanceSyncOperations.operationId] })
      .returning();
    if (operation) return operation;
    const [existing] = await this.database.db.select().from(attendanceSyncOperations).where(and(eq(attendanceSyncOperations.schoolId, schoolId), eq(attendanceSyncOperations.operationId, operationId))).limit(1);
    if (!existing) throw new ConflictException("Attendance sync operation could not be recorded");
    if (existing.requestFingerprint !== requestFingerprint) throw new ConflictException("The operation id was already used for a different payload");
    return existing;
  }

  async reconcileSyncOperation(schoolId: string, operationId: string, status: "applied" | "conflict", attendanceRecordId?: string, conflictReason?: string) {
    const [operation] = await this.database.db.update(attendanceSyncOperations)
      .set({ status, attendanceRecordId, conflictReason, reconciledAt: new Date(), updatedAt: new Date() })
      .where(and(eq(attendanceSyncOperations.schoolId, schoolId), eq(attendanceSyncOperations.operationId, operationId)))
      .returning();
    if (!operation) throw new NotFoundException("Attendance sync operation not found");
    return operation;
  }

  async listSyncOperations(schoolId: string, status?: string) {
    return this.database.db.select().from(attendanceSyncOperations).where(and(eq(attendanceSyncOperations.schoolId, schoolId), status ? eq(attendanceSyncOperations.status, status) : undefined)).orderBy(asc(attendanceSyncOperations.createdAt));
  }

  async list(schoolId: string, filters: { classId?: string; armId?: string; sessionId?: string; termId?: string; date?: Date }) {
    return this.database.db.select().from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), filters.classId ? eq(attendanceRecords.classId, filters.classId) : undefined, filters.armId ? eq(attendanceRecords.armId, filters.armId) : undefined, filters.sessionId ? eq(attendanceRecords.sessionId, filters.sessionId) : undefined, filters.termId ? eq(attendanceRecords.termId, filters.termId) : undefined, filters.date ? eq(attendanceRecords.attendanceDate, filters.date) : undefined)).orderBy(asc(attendanceRecords.attendanceDate));
  }

  async find(schoolId: string, id: string) {
    const [record] = await this.database.db.select().from(attendanceRecords).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.id, id))).limit(1);
    return record;
  }

  async transition(schoolId: string, id: string, status: string, userId: string, reason?: string) {
    const [record] = await this.database.db.update(attendanceRecords).set({ status, reviewedByUserId: userId, reviewReason: reason, updatedAt: new Date() }).where(and(eq(attendanceRecords.schoolId, schoolId), eq(attendanceRecords.id, id))).returning();
    if (!record) throw new NotFoundException("Attendance record not found");
    return record;
  }

  async listExceptions(schoolId: string, status?: string) {
    return this.database.db.select().from(attendanceExceptions).where(and(eq(attendanceExceptions.schoolId, schoolId), status ? eq(attendanceExceptions.status, status) : undefined)).orderBy(asc(attendanceExceptions.createdAt));
  }

  async createException(schoolId: string, input: { attendanceRecordId: string; studentId: string; kind: string; note?: string; ownerUserId?: string }) {
    const [exception] = await this.database.db.insert(attendanceExceptions).values({ schoolId, ...input }).returning();
    return exception;
  }

  async transitionException(schoolId: string, id: string, status: string, note?: string) {
    const now = new Date();
    const [exception] = await this.database.db.update(attendanceExceptions).set({ status, note, contactedAt: status === "contacted" ? now : undefined, resolvedAt: status === "resolved" ? now : undefined, updatedAt: now }).where(and(eq(attendanceExceptions.schoolId, schoolId), eq(attendanceExceptions.id, id))).returning();
    if (!exception) throw new NotFoundException("Attendance exception not found");
    return exception;
  }
}
