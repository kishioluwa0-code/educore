import { BadRequestException, Controller, Get, Param, Query, Req, UseGuards, Inject } from "@nestjs/common";
import { z } from "zod";
import { ResultsService } from "./results.service.js";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";

// Validation schemas
const uuidSchema = z.string().uuid();

@Controller("results")
@UseGuards(AuthGuard)
export class ResultsController {
  constructor(@Inject(ResultsService) private readonly service: ResultsService) {}

  private requestId(request: EducoreRequest) {
    const header = request.headers["x-request-id"];
    return (Array.isArray(header) ? header[0] : header) || "unknown";
  }

  /**
   * GET /api/results/me
   * Student views own published results
   */
  @Get("me")
  async getMyResults(@Req() request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const requestId = this.requestId(request);
    return await this.service.getMyResults(principal, requestId);
  }

  /**
   * GET /api/results/student/:studentId
   * Parent or authorized admin views a student's published results
   */
  @Get("student/:studentId")
  async getStudentResults(@Req() request: EducoreRequest, @Param("studentId") studentId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    // Validate studentId is a valid UUID
    const parsedStudentId = uuidSchema.safeParse(studentId);
    if (!parsedStudentId.success) throw new BadRequestException("A valid student ID is required");
    const requestId = this.requestId(request);
    return await this.service.getStudentResults(principal, requestId, parsedStudentId.data);
  }

  /**
   * GET /api/results/:snapshotId/verify
   * Verify a published result (authentication and publication proof)
   * Query params: ?studentId=<uuid> (required for scope check)
   */
  @Get(":snapshotId/verify")
  async verifyResult(@Req() request: EducoreRequest, @Param("snapshotId") snapshotId: string, @Query("studentId") studentIdParam?: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    // Validate snapshotId
    const parsedSnapshotId = uuidSchema.safeParse(snapshotId);
    if (!parsedSnapshotId.success) throw new BadRequestException("A valid snapshot ID is required");

    // Extract studentId from query params
    const studentId = studentIdParam || (request.query as Record<string, string>)?.["studentId"];

    if (!studentId || typeof studentId !== "string") {
      throw new BadRequestException("studentId query parameter is required");
    }

    const parsedStudentId = uuidSchema.safeParse(studentId);
    if (!parsedStudentId.success) throw new BadRequestException("A valid student ID is required");
    const requestId = this.requestId(request);
    return await this.service.verifyResult(principal, requestId, parsedSnapshotId.data, parsedStudentId.data);
  }
}
