import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { QuestionBankService } from "./question-bank.service.js";

const versionSchema = z.object({ type: z.enum(["single_choice", "multiple_choice", "true_false", "short_answer"]), prompt: z.string().trim().min(1).max(10000), options: z.array(z.string().trim().min(1).max(500)).max(10), correctAnswer: z.string().trim().min(1).max(500), explanation: z.string().trim().max(5000).optional(), points: z.number().int().min(1).max(100) });
const questionSchema = versionSchema.extend({ code: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._-]+$/), subjectId: z.string().uuid().optional(), tags: z.array(z.string().trim().min(1).max(50)).max(20) });

@Controller("question-bank")
@UseGuards(AuthGuard)
export class QuestionBankController {
  constructor(@Inject(QuestionBankService) private readonly service: QuestionBankService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Query("status") status?: string) {
    if (status && !["draft", "reviewed", "retired"].includes(status)) throw new BadRequestException("Invalid question status");
    return this.service.list(this.principal(request), status);
  }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = questionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid question is required");
    return this.service.create(this.principal(request), this.requestId(request), parsed.data);
  }

  @Post(":id/versions")
  version(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) {
    const parsed = versionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid question version is required");
    return this.service.addVersion(this.principal(request), this.requestId(request), id, parsed.data);
  }

  @Patch(":id/versions/:versionId/review")
  review(@Req() request: EducoreRequest, @Param("id") id: string, @Param("versionId") versionId: string) {
    return this.service.review(this.principal(request), this.requestId(request), id, versionId);
  }

  @Patch(":id/retire")
  retire(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.retire(this.principal(request), this.requestId(request), id);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
