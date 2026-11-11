import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { AssignmentService } from "./assignment.service.js";

const assignmentSchema = z.object({
  type: z.enum(["class", "subject"]),
  teacherUserId: z.string().uuid(),
  classId: z.string().uuid(),
  armId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  effectiveFrom: z.coerce.date(),
  effectiveTo: z.coerce.date().optional(),
});
const filtersSchema = z.object({ type: z.enum(["class", "subject"]).optional(), teacherUserId: z.string().uuid().optional(), sessionId: z.string().uuid().optional(), termId: z.string().uuid().optional() });

@Controller("academics/assignments")
@UseGuards(AuthGuard)
export class AssignmentController {
  constructor(@Inject(AssignmentService) private readonly assignments: AssignmentService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Query() query: Record<string, unknown>) {
    const parsed = filtersSchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Assignment filters are invalid");
    return this.assignments.list(this.principal(request), parsed.data);
  }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid academic assignment is required");
    return this.assignments.create(this.principal(request), this.requestId(request), parsed.data);
  }

  @Delete(":type/:assignmentId")
  close(@Req() request: EducoreRequest, @Param("type") type: string, @Param("assignmentId") assignmentId: string, @Body() body: unknown) {
    const parsedType = z.enum(["class", "subject"]).safeParse(type);
    const parsedBody = z.object({ effectiveTo: z.coerce.date() }).safeParse(body);
    if (!parsedType.success || !parsedBody.success) throw new BadRequestException("A valid assignment type and close date are required");
    return this.assignments.close(this.principal(request), this.requestId(request), parsedType.data, assignmentId, parsedBody.data.effectiveTo);
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
