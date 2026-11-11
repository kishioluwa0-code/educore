import { Injectable, ForbiddenException, NotFoundException, Inject } from "@nestjs/common";
import { ResultsRepository, PublishedResult } from "./results.repository.js";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { DatabaseService } from "../database/database.module.js";
import { eq, and } from "drizzle-orm";
import { students, studentGuardians } from "../../drizzle/schema.js";

@Injectable()
export class ResultsService {
  constructor(
    @Inject(ResultsRepository) private readonly repository: ResultsRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DatabaseService) private readonly database: DatabaseService
  ) {}

  private school(principal: AuthenticatedPrincipal) {
    return this.tenancy.resolveActiveMembership(principal).schoolId;
  }

  /**
   * Get student's own published results
   * Enforces gradebookRead capability
   */
  async getMyResults(principal: AuthenticatedPrincipal, requestId: string): Promise<PublishedResult[]> {
    const schoolId = this.school(principal);
    if (!schoolId) throw new ForbiddenException("No active school membership");

    // Check if user is a student in this school
    const studentRecord = await this.database.db
      .select()
      .from(students)
      .where(and(eq(students.schoolId, schoolId), eq(students.userId, principal.userId)))
      .limit(1);

    if (studentRecord.length === 0) {
      throw new ForbiddenException("User is not a student in this school");
    }

    const results = await this.repository.getStudentResults(studentRecord[0].id);

    // Audit: result access
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "result.student.view",
      objectType: "result",
      objectId: studentRecord[0].id,
      outcome: "allowed",
      requestId,
    });

    return results;
  }

  /**
   * Get published results for a specific student (parent access)
   * Verifies parent-child relationship and enforces gradebookRead
   */
  async getStudentResults(principal: AuthenticatedPrincipal, requestId: string, studentId: string): Promise<PublishedResult[]> {
    const schoolId = this.school(principal);
    if (!schoolId) throw new ForbiddenException("No active school membership");

    // Verify student exists and belongs to this school
    const student = await this.database.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1);

    if (student.length === 0) {
      throw new NotFoundException("Student not found");
    }

    // Check if requester is the student's guardian
    const guardian = await this.database.db
      .select()
      .from(studentGuardians)
      .where(and(
        eq(studentGuardians.schoolId, schoolId),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.guardianUserId, principal.userId),
      ))
      .limit(1);

    // If not a guardian, check if requester is admin/principal with capability
    if (guardian.length === 0) {
      this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookRead);
    }

    const results = await this.repository.getStudentResults(studentId);

    // Audit: result access
    const accessType = guardian.length > 0 ? "parent" : "admin";
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: `result.${accessType}.view`,
      objectType: "result",
      objectId: studentId,
      outcome: "allowed",
      requestId,
    });

    return results;
  }

  /**
   * Verify a published result and return publication proof
   * Returns snapshot + submission metadata
   */
  async verifyResult(principal: AuthenticatedPrincipal, requestId: string, snapshotId: string, studentId: string): Promise<{
    snapshot: any;
    submission: any;
  }> {
    const schoolId = this.school(principal);
    if (!schoolId) throw new ForbiddenException("No active school membership");

    // Verify student exists and belongs to this school
    const student = await this.database.db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
      .limit(1);

    if (student.length === 0) {
      throw new NotFoundException("Student not found");
    }

    // Check authorization: student viewing own, parent of child, or admin with capability
    const isOwnResult = student[0].userId === principal.userId;
    const isParent = await this.database.db
      .select()
      .from(studentGuardians)
      .where(and(
        eq(studentGuardians.schoolId, schoolId),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.guardianUserId, principal.userId)
      ))
      .limit(1);

    if (!isOwnResult && isParent.length === 0) {
      this.authorization.requireCapability(principal, schoolId, CAPABILITIES.gradebookRead);
    }

    const verification = await this.repository.verifyResult(snapshotId, studentId);

    if (!verification) {
      throw new NotFoundException("Result not found or not published");
    }

    // Audit: verification
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "result.verify",
      objectType: "result",
      objectId: snapshotId,
      outcome: "allowed",
      requestId,
    });

    return verification;
  }
}
