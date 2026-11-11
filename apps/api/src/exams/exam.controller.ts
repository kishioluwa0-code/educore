import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { ExamService } from "./exam.service.js";

const createSchema = z.object({
  poolId: z.string().uuid(),
  sessionId: z.string().uuid(),
  code: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._-]+$/),
  name: z.string().trim().min(2).max(200),
  opensAt: z.coerce.date(),
  closesAt: z.coerce.date(),
  questionsPerStudent: z.number().int().positive().max(500),
  gradebookId: z.string().uuid().optional(),
  gradeComponentKey: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9._-]+$/).optional(),
});
const snapshotSchema = z.object({ studentIds: z.array(z.string().uuid()).min(1).max(10000) });

@Controller("exams")
@UseGuards(AuthGuard)
export class ExamController {
  constructor(@Inject(ExamService) private readonly service: ExamService) {}

  @Get()
  list(@Req() request: EducoreRequest) {
    return this.service.list(this.principal(request));
  }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid exam configuration is required");
    return this.service.create(this.principal(request), this.requestId(request), parsed.data);
  }

  @Post(":id/candidate-snapshot")
  snapshot(@Req() request: EducoreRequest, @Body() body: unknown, @Param("id") id: string) {
    const parsed = snapshotSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A bounded candidate snapshot is required");
    return this.service.snapshot(this.principal(request), this.requestId(request), id, parsed.data.studentIds);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
