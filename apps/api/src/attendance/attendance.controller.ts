import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { AttendanceService } from "./attendance.service.js";

const entrySchema = z.object({ studentId: z.string().uuid(), status: z.enum(["present", "absent", "late", "excused"]), note: z.string().trim().max(500).optional() });
const attendanceSchema = z.object({ classId: z.string().uuid(), armId: z.string().uuid(), sessionId: z.string().uuid(), termId: z.string().uuid(), attendanceDate: z.coerce.date(), entries: z.array(entrySchema).min(1) });
const syncSchema = z.object({ operations: z.array(z.object({ operationId: z.string().trim().min(8).max(200), input: attendanceSchema })).min(1).max(100) });
const filterSchema = z.object({ classId: z.string().uuid().optional(), armId: z.string().uuid().optional(), sessionId: z.string().uuid().optional(), termId: z.string().uuid().optional(), date: z.coerce.date().optional() });
const exceptionSchema = z.object({ attendanceRecordId: z.string().uuid(), studentId: z.string().uuid(), kind: z.enum(["absence", "lateness"]), note: z.string().trim().max(500).optional(), ownerUserId: z.string().uuid().optional() });

@Controller("attendance")
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly attendance: AttendanceService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Query() query: Record<string, unknown>) {
    const parsed = filterSchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Attendance filters are invalid");
    return this.attendance.list(this.principal(request), parsed.data);
  }

  @Get("exceptions")
  listExceptions(@Req() request: EducoreRequest, @Query("status") status?: string) { return this.attendance.listExceptions(this.principal(request), status); }

  @Get("sync")
  syncStatus(@Req() request: EducoreRequest, @Query("status") status?: string) {
    if (status && !["pending", "applied", "conflict"].includes(status)) throw new BadRequestException("Invalid sync status");
    return this.attendance.syncStatus(this.principal(request), status);
  }

  @Post("sync")
  sync(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A bounded attendance sync batch is required");
    return this.attendance.sync(this.principal(request), this.requestId(request), parsed.data.operations.map((operation) => ({ operationId: operation.operationId, input: operation.input })));
  }

  @Post("exceptions")
  createException(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = exceptionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid attendance exception is required");
    return this.attendance.createException(this.principal(request), this.requestId(request), parsed.data);
  }

  @Patch("exceptions/:id/:transition")
  transitionException(@Req() request: EducoreRequest, @Param("id") id: string, @Param("transition") transition: string, @Body() body: unknown) {
    const parsedTransition = z.enum(["contacted", "resolved"]).safeParse(transition);
    const parsedBody = z.object({ note: z.string().trim().max(500).optional() }).safeParse(body ?? {});
    if (!parsedTransition.success || !parsedBody.success) throw new BadRequestException("Invalid attendance exception transition");
    return this.attendance.transitionException(this.principal(request), this.requestId(request), id, parsedTransition.data, parsedBody.data.note);
  }

  @Get(":id")
  find(@Req() request: EducoreRequest, @Param("id") id: string) { return this.attendance.find(this.principal(request), id); }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = attendanceSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid attendance record is required");
    const header = request.headers["idempotency-key"];
    const idempotencyKey = Array.isArray(header) ? header[0] : header;
    if (idempotencyKey && (idempotencyKey.length < 8 || idempotencyKey.length > 200)) throw new BadRequestException("Idempotency-Key must contain 8 to 200 characters");
    return this.attendance.create(this.principal(request), this.requestId(request), parsed.data, idempotencyKey);
  }

  @Patch(":id/:transition")
  transition(@Req() request: EducoreRequest, @Param("id") id: string, @Param("transition") transition: string, @Body() body: unknown) {
    const parsedTransition = z.enum(["submitted", "returned", "approved"]).safeParse(transition);
    const parsedBody = z.object({ reason: z.string().trim().max(500).optional() }).safeParse(body ?? {});
    if (!parsedTransition.success || !parsedBody.success) throw new BadRequestException("Invalid attendance transition");
    return this.attendance.transition(this.principal(request), this.requestId(request), id, parsedTransition.data, parsedBody.data.reason);
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
