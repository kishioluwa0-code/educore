import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { MovementService } from "./movement.service.js";

const movementSchema = z.object({
  sessionId: z.string().uuid(),
  decision: z.enum(["promote", "retain", "graduate"]),
  toClassId: z.string().uuid().optional(),
  toArmId: z.string().uuid().optional(),
  effectiveDate: z.coerce.date(),
  reason: z.string().trim().min(1).max(1000),
});

@Controller("student-movements")
@UseGuards(AuthGuard)
export class MovementController {
  constructor(@Inject(MovementService) private readonly service: MovementService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Query("sessionId") sessionId?: string) {
    return this.service.list(this.principal(request), sessionId);
  }

  @Post(":studentId")
  decide(@Req() request: EducoreRequest, @Param("studentId") studentId: string, @Body() body: unknown) {
    const parsed = movementSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid student movement decision is required");
    return this.service.decide(this.principal(request), request.educoreContext?.requestId ?? "unknown", studentId, parsed.data);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
}
