import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { CbtPoolService } from "./cbt-pool.service.js";

const policySchema = z.object({ showScore: z.boolean(), showCorrectAnswers: z.boolean(), release: z.enum(["immediate", "after_close"]) });
const createSchema = z.object({ code: z.string().trim().min(2).max(100).regex(/^[A-Za-z0-9._-]+$/), name: z.string().trim().min(2).max(200), mode: z.enum(["school", "practice"]), resultPolicy: policySchema });
const questionSchema = z.object({ questionVersionId: z.string().uuid(), position: z.number().int().positive().max(10000) });

@Controller("cbt-pools")
@UseGuards(AuthGuard)
export class CbtPoolController {
  constructor(@Inject(CbtPoolService) private readonly service: CbtPoolService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Query("mode") mode?: string) {
    if (mode && !["school", "practice"].includes(mode)) throw new BadRequestException("Invalid CBT pool mode");
    return this.service.list(this.principal(request), mode as "school" | "practice" | undefined);
  }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid CBT pool is required");
    return this.service.create(this.principal(request), this.requestId(request), parsed.data);
  }

  @Post(":id/questions")
  addQuestion(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) {
    const parsed = questionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid reviewed question version is required");
    return this.service.addQuestion(this.principal(request), this.requestId(request), id, parsed.data.questionVersionId, parsed.data.position);
  }

  @Patch(":id/publish")
  publish(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.publish(this.principal(request), this.requestId(request), id);
  }

  @Patch(":id/archive")
  archive(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.archive(this.principal(request), this.requestId(request), id);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
