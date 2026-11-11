import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { GradebookService } from "./gradebook.service.js";

const componentSchema = z.object({ name: z.string().min(1).max(100), weight: z.number().int().min(0).max(100) });
const policySchema = z.array(componentSchema);
const scoresSchema = z.record(z.string(), z.number().int().min(0).max(100));

@Controller("gradebooks")
@UseGuards(AuthGuard)
export class GradebookController {
  constructor(@Inject(GradebookService) private readonly service: GradebookService) {}

  @Post(":classId/:armId/:sessionId")
  async create(
    @Req() request: EducoreRequest,
    @Param("classId") classId: string,
    @Param("armId") armId: string,
    @Param("sessionId") sessionId: string,
    @Body() body: unknown,
  ) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const parsed = z.object({ termId: z.string().uuid().optional(), subjectId: z.string().uuid().optional() }).safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException("Invalid gradebook parameters");

    return this.service.getOrCreateGradebook(
      principal,
      classId,
      armId,
      sessionId,
      parsed.data.termId,
      parsed.data.subjectId,
    );
  }

  @Get(":gradebookId")
  async get(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");
    return this.service.getGradebook(principal, gradebookId);
  }

  @Patch(":gradebookId/policy")
  async updatePolicy(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string, @Body() body: unknown) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const parsed = policySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid component policy");

    const requestId = this.requestId(request);
    return this.service.updateComponentPolicy(principal, requestId, gradebookId, parsed.data);
  }

  @Get(":gradebookId/rows")
  async listRows(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");
    return this.service.listGradeRows(principal, gradebookId);
  }

  @Get(":gradebookId/rows/:studentId")
  async getRow(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string, @Param("studentId") studentId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");
    return this.service.getGradeRow(principal, gradebookId, studentId);
  }

  @Post(":gradebookId/rows/:studentId")
  async setRow(
    @Req() request: EducoreRequest,
    @Param("gradebookId") gradebookId: string,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const parsed = scoresSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid scores: must be object with numeric keys 0-100");

    const requestId = this.requestId(request);
    const expectedVersion = request.headers["if-match"];
    if (Array.isArray(expectedVersion)) throw new BadRequestException("If-Match must contain one row version");
    const parsedExpected = expectedVersion ? z.coerce.number().int().positive().safeParse(expectedVersion.replace(/^"|"$/g, "")) : undefined;
    if (parsedExpected && !parsedExpected.success) throw new BadRequestException("If-Match must be a positive row version");
    return this.service.setGradeRow(
      principal,
      requestId,
      gradebookId,
      studentId,
      parsed.data,
      parsedExpected?.data,
    );
  }

  private requestId(request: EducoreRequest) {
    const header = request.headers["x-request-id"];
    return (Array.isArray(header) ? header[0] : header) || "unknown";
  }
}
