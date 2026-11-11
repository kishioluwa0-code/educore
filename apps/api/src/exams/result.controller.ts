import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { ResultService } from "./result.service.js";

@Controller()
@UseGuards(AuthGuard)
export class ResultController {
  constructor(@Inject(ResultService) private readonly service: ResultService) {}

  @Post("cbt-attempts/:id/mark")
  mark(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.mark(this.principal(request), this.requestId(request), id);
  }

  @Post("cbt-results/:id/publish")
  publish(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.publish(this.principal(request), this.requestId(request), id);
  }

  @Patch("cbt-results/:id/questions/:questionVersionId")
  markShortAnswer(
    @Req() request: EducoreRequest,
    @Param("id") id: string,
    @Param("questionVersionId") questionVersionId: string,
    @Body() body: unknown,
  ) {
    const parsed = z.object({ awarded: z.number().int().min(0) }).safeParse(body);
    if (!parsed.success) throw new ConflictException("An integer awarded score is required");
    return this.service.markShortAnswer(
      this.principal(request),
      this.requestId(request),
      id,
      questionVersionId,
      parsed.data.awarded,
    );
  }

  @Get("cbt-results/:id")
  get(@Req() request: EducoreRequest, @Param("id") id: string) {
    return this.service.get(this.principal(request), id);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }

  private requestId(request: EducoreRequest) {
    return request.educoreContext?.requestId ?? "unknown";
  }
}
