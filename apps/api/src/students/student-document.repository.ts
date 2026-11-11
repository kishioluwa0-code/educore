import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, inArray } from "drizzle-orm";
import { studentDocuments } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";

export const REQUIRED_ADMISSION_DOCUMENTS = ["birth_certificate", "passport_photo"] as const;

export type RegisterStudentDocument = {
  studentId: string;
  schoolId: string;
  documentType: string;
  requirementKey: string;
  storageKey: string;
  checksum: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  uploadedByUserId: string;
};

@Injectable()
export class StudentDocumentRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async listByStudent(schoolId: string, studentId: string) {
    return this.database.db
      .select()
      .from(studentDocuments)
      .where(
        and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.studentId, studentId)),
      )
      .orderBy(asc(studentDocuments.createdAt));
  }

  async create(input: RegisterStudentDocument) {
    const [document] = await this.database.db.insert(studentDocuments).values(input).returning();
    return document;
  }

  async findById(schoolId: string, documentId: string) {
    const [document] = await this.database.db
      .select()
      .from(studentDocuments)
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.id, documentId)))
      .limit(1);
    return document;
  }

  async replaceContent(
    schoolId: string,
    documentId: string,
    input: Pick<
      RegisterStudentDocument,
      "storageKey" | "checksum" | "originalFilename" | "mimeType" | "byteSize"
    >,
    uploadedByUserId: string,
  ) {
    const [document] = await this.database.db
      .update(studentDocuments)
      .set({
        ...input,
        status: "pending",
        rejectionReason: null,
        verifiedByUserId: null,
        verifiedAt: null,
        uploadedByUserId,
        updatedAt: new Date(),
      })
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.id, documentId)))
      .returning();
    return document;
  }

  async updateStatus(
    schoolId: string,
    documentId: string,
    status: "verified" | "rejected",
    verifiedByUserId: string,
    rejectionReason?: string,
  ) {
    const [document] = await this.database.db
      .update(studentDocuments)
      .set({
        status,
        rejectionReason,
        verifiedByUserId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.id, documentId)))
      .returning();
    return document;
  }

  async delete(schoolId: string, documentId: string) {
    const [document] = await this.database.db
      .delete(studentDocuments)
      .where(and(eq(studentDocuments.schoolId, schoolId), eq(studentDocuments.id, documentId)))
      .returning();
    return document;
  }

  async hasVerifiedRequirements(schoolId: string, studentId: string) {
    const rows = await this.database.db
      .select({ requirementKey: studentDocuments.requirementKey })
      .from(studentDocuments)
      .where(
        and(
          eq(studentDocuments.schoolId, schoolId),
          eq(studentDocuments.studentId, studentId),
          eq(studentDocuments.status, "verified"),
          inArray(studentDocuments.requirementKey, [...REQUIRED_ADMISSION_DOCUMENTS]),
        ),
      );
    const verified = new Set(rows.map((row) => row.requirementKey));
    return REQUIRED_ADMISSION_DOCUMENTS.every((key) => verified.has(key));
  }
}
