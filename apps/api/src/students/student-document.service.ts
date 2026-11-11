import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import { PostgresError } from "postgres";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { StudentRepository } from "./student.repository.js";
import {
  StudentDocumentRepository,
  type RegisterStudentDocument,
} from "./student-document.repository.js";
import { DocumentStorageService } from "./document-storage.service.js";

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

@Injectable()
export class StudentDocumentService {
  constructor(
    @Inject(StudentDocumentRepository) private readonly repository: StudentDocumentRepository,
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DocumentStorageService) private readonly storage: DocumentStorageService,
  ) {}

  private schoolId(principal: AuthenticatedPrincipal) {
    if (!principal.activeSchoolId) throw new NotFoundException("No active school is selected");
    return principal.activeSchoolId;
  }

  async list(principal: AuthenticatedPrincipal, studentId: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    const student = await this.students.findById(schoolId, studentId);
    if (!student) throw new NotFoundException("Student not found");
    return this.repository.listByStudent(schoolId, studentId);
  }

  async register(
    principal: AuthenticatedPrincipal,
    requestId: string,
    studentId: string,
    input: Omit<
      RegisterStudentDocument,
      "studentId" | "schoolId" | "storageKey" | "uploadedByUserId"
    >,
  ) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    const student = await this.students.findById(schoolId, studentId);
    if (!student) throw new NotFoundException("Student not found");
    if (!ALLOWED_MIME_TYPES.has(input.mimeType))
      throw new ConflictException("Unsupported document type");
    if (input.byteSize < 1 || input.byteSize > MAX_DOCUMENT_BYTES) {
      throw new ConflictException("Document size must be between 1 byte and 10 MB");
    }
    if (!/^[a-f0-9]{64}$/i.test(input.checksum))
      throw new ConflictException("A SHA-256 checksum is required");

    try {
      const document = await this.repository.create({
        ...input,
        studentId,
        schoolId,
        storageKey: `${schoolId}/students/${studentId}/${randomUUID()}`,
        uploadedByUserId: principal.userId,
      });
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "student.document.register",
        objectType: "student_document",
        objectId: document.id,
        outcome: "allowed",
        requestId,
        after: document,
      });
      return document;
    } catch (error) {
      if (error instanceof PostgresError && error.code === "23505") {
        throw new ConflictException("This document record already exists");
      }
      throw error;
    }
  }

  async decide(
    principal: AuthenticatedPrincipal,
    requestId: string,
    documentId: string,
    status: "verified" | "rejected",
    rejectionReason?: string,
  ) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentApprove);
    if (status === "rejected" && !rejectionReason?.trim()) {
      throw new ConflictException("A rejection reason is required");
    }
    const document = await this.repository.updateStatus(
      schoolId,
      documentId,
      status,
      principal.userId,
      rejectionReason?.trim(),
    );
    if (!document) throw new NotFoundException("Document not found");
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: `student.document.${status}`,
      objectType: "student_document",
      objectId: document.id,
      outcome: "allowed",
      reason: rejectionReason?.trim(),
      requestId,
      after: document,
    });
    return document;
  }

  async upload(
    principal: AuthenticatedPrincipal,
    requestId: string,
    studentId: string,
    documentType: string,
    requirementKey: string,
    originalFilename: string,
    mimeType: string,
    data: Buffer,
  ) {
    const checksum = this.validateFile(originalFilename, mimeType, data);
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    const student = await this.students.findById(schoolId, studentId);
    if (!student) throw new NotFoundException("Student not found");
    const storageKey = `${schoolId}/students/${studentId}/${randomUUID()}`;
    await this.storage.put(storageKey, data);
    try {
      const document = await this.repository.create({
        studentId,
        schoolId,
        documentType,
        requirementKey,
        storageKey,
        checksum,
        originalFilename,
        mimeType,
        byteSize: data.byteLength,
        uploadedByUserId: principal.userId,
      });
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "student.document.upload",
        objectType: "student_document",
        objectId: document.id,
        outcome: "allowed",
        requestId,
        after: document,
      });
      return document;
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async replace(
    principal: AuthenticatedPrincipal,
    requestId: string,
    documentId: string,
    originalFilename: string,
    mimeType: string,
    data: Buffer,
  ) {
    const checksum = this.validateFile(originalFilename, mimeType, data);
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    const before = await this.repository.findById(schoolId, documentId);
    if (!before) throw new NotFoundException("Document not found");
    const storageKey = `${schoolId}/students/${before.studentId}/${randomUUID()}`;
    await this.storage.put(storageKey, data);
    try {
      const document = await this.repository.replaceContent(
        schoolId,
        documentId,
        { storageKey, checksum, originalFilename, mimeType, byteSize: data.byteLength },
        principal.userId,
      );
      if (!document) throw new NotFoundException("Document not found");
      await this.storage.remove(before.storageKey);
      await this.audit.record({
        schoolId,
        actorUserId: principal.userId,
        action: "student.document.replace",
        objectType: "student_document",
        objectId: document.id,
        outcome: "allowed",
        requestId,
        before,
        after: document,
      });
      return document;
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
  }

  async download(principal: AuthenticatedPrincipal, documentId: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    const document = await this.repository.findById(schoolId, documentId);
    if (!document) throw new NotFoundException("Document not found");
    if (document.status !== "verified") {
      throw new ConflictException("Document is not available until an administrator verifies it");
    }
    const url = await this.storage.signedDownloadUrl(document.storageKey);
    return url
      ? { document, url }
      : { document, data: await this.storage.read(document.storageKey) };
  }

  async remove(principal: AuthenticatedPrincipal, requestId: string, documentId: string) {
    const schoolId = this.schoolId(principal);
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    const document = await this.repository.delete(schoolId, documentId);
    if (!document) throw new NotFoundException("Document not found");
    await this.storage.remove(document.storageKey);
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.document.delete",
      objectType: "student_document",
      objectId: document.id,
      outcome: "allowed",
      requestId,
      before: document,
    });
    return { deleted: true, id: document.id };
  }

  private validateFile(originalFilename: string, mimeType: string, data: Buffer) {
    if (!originalFilename.trim() || originalFilename.length > 255) {
      throw new ConflictException("A valid filename is required");
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) throw new ConflictException("Unsupported document type");
    if (data.byteLength < 1 || data.byteLength > MAX_DOCUMENT_BYTES) {
      throw new ConflictException("Document size must be between 1 byte and 10 MB");
    }
    return createHash("sha256").update(data).digest("hex");
  }
}
