import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { AttemptService } from "./attempt.service.js";

const autosaveSchema = z.object({ operationId: z.string().trim().min(8).max(200), sequence: z.number().int().positive(), answers: z.record(z.union([z.string().max(500), z.array(z.string().max(500)).max(10)])) });
const eventSchema = z.object({
  operationId: z.string().trim().min(8).max(200),
  sequence: z.number().int().positive(),
  eventType: z.enum(["connected", "disconnected", "reconnected", "fullscreen_exit", "fullscreen_enter", "tab_hidden", "tab_visible", "blur", "focus"]),
  occurredAt: z.string().datetime({ offset: true }),
  metadata: z.record(z.union([z.string().max(200), z.number().finite(), z.boolean()])).refine((value) => Object.keys(value).length <= 20),
});

@Controller()
@UseGuards(AuthGuard)
export class AttemptController {
  constructor(@Inject(AttemptService) private readonly service: AttemptService) {}

  @Post("exams/:id/attempts")
  start(@Req() request: EducoreRequest, @Param("id") id: string) { return this.service.start(this.principal(request), this.requestId(request), id); }

  @Get("cbt-attempts/:id")
  get(@Req() request: EducoreRequest, @Param("id") id: string) { return this.service.get(this.principal(request), id); }

  @Patch("cbt-attempts/:id/autosave")
  autosave(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) {
    const parsed = autosaveSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid retry-safe autosave is required");
    return this.service.autosave(this.principal(request), this.requestId(request), id, parsed.data.operationId, parsed.data.sequence, parsed.data.answers);
  }

  @Post("cbt-attempts/:id/submit")
  submit(@Req() request: EducoreRequest, @Param("id") id: string) { return this.service.submit(this.principal(request), this.requestId(request), id); }

  @Post("cbt-attempts/:id/reset")
  reset(@Req() request: EducoreRequest, @Param("id") id: string) { return this.service.reset(this.principal(request), this.requestId(request), id); }

  @Post("cbt-attempts/:id/events")
  event(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) {
    const parsed = eventSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid attempt event is required");
    return this.service.recordEvent(this.principal(request), this.requestId(request), id, parsed.data.operationId, parsed.data.sequence, parsed.data.eventType, new Date(parsed.data.occurredAt), parsed.data.metadata);
  }

  @Get("cbt-attempts/:id/events")
  events(@Req() request: EducoreRequest, @Param("id") id: string, @Query("afterSequence") afterSequence?: string) {
    const sequence = afterSequence === undefined ? 0 : Number(afterSequence);
    if (!Number.isSafeInteger(sequence) || sequence < 0) throw new BadRequestException("afterSequence must be a non-negative integer");
    return this.service.listEvents(this.principal(request), id, sequence);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
