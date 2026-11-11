import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UseGuards, Req } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { AcademicService } from "./academic.service.js";

const scopeQuerySchema = z.object({ sessionId: z.string().uuid().optional(), termId: z.string().uuid().optional() });
const idSchema = z.string().uuid();
const structureSchema = z.object({ name: z.string().trim().min(1).max(100), status: z.enum(["planned", "active", "closed"]).optional(), section: z.string().trim().max(100).optional(), code: z.string().trim().min(1).max(30).optional() });
const termSchema = z.object({ name: z.string().trim().min(1).max(100), startsAt: z.coerce.date().optional(), endsAt: z.coerce.date().optional() });

@Controller("academics")
@UseGuards(AuthGuard)
export class AcademicController {
  constructor(@Inject(AcademicService) private readonly academics: AcademicService) {}

  @Get("me/scope")
  scope(@Req() request: EducoreRequest, @Query() query: Record<string, unknown>) {
    const parsed = scopeQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException("Session and term filters must be valid IDs");
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return this.academics.resolveTeacherScope(principal, parsed.data.sessionId, parsed.data.termId);
  }

  @Get("structure") structure(@Req() request: EducoreRequest) { return this.academics.structureList(this.principal(request)); }
  @Post("structure/:kind") createStructure(@Req() request: EducoreRequest, @Param("kind") kind: string, @Body() body: unknown) { if (!["session", "class", "subject"].includes(kind)) throw new BadRequestException("Invalid academic structure kind"); const parsed = structureSchema.safeParse(body); if (!parsed.success) throw new BadRequestException("A valid academic structure record is required"); return this.academics.structureCreate(this.principal(request), this.requestId(request), kind, { ...parsed.data, ...(kind === "subject" ? { code: parsed.data.code } : {}) }); }
  @Patch("structure/:kind/:id") updateStructure(@Req() request: EducoreRequest, @Param("kind") kind: string, @Param("id") id: string, @Body() body: unknown) { if (!["session", "class", "subject"].includes(kind) || !idSchema.safeParse(id).success) throw new BadRequestException("Invalid academic structure path"); const parsed = structureSchema.partial().safeParse(body); if (!parsed.success) throw new BadRequestException("A valid academic structure update is required"); return this.academics.structureUpdate(this.principal(request), this.requestId(request), kind, id, parsed.data); }
  @Delete("structure/:kind/:id") deleteStructure(@Req() request: EducoreRequest, @Param("kind") kind: string, @Param("id") id: string) { if (!["session", "class", "subject"].includes(kind) || !idSchema.safeParse(id).success) throw new BadRequestException("Invalid academic structure path"); return this.academics.structureDelete(this.principal(request), this.requestId(request), kind, id); }
  @Get("sessions/:sessionId/terms") terms(@Req() request: EducoreRequest, @Param("sessionId") sessionId: string) { return this.academics.terms(this.principal(request), sessionId); }
  @Post("sessions/:sessionId/terms") createTerm(@Req() request: EducoreRequest, @Param("sessionId") sessionId: string, @Body() body: unknown) { const parsed = termSchema.safeParse(body); if (!parsed.success) throw new BadRequestException("A valid term is required"); return this.academics.createTerm(this.principal(request), this.requestId(request), sessionId, parsed.data); }
  @Patch("terms/:id") updateTerm(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) { const parsed = termSchema.partial().safeParse(body); if (!parsed.success) throw new BadRequestException("A valid term update is required"); return this.academics.updateTerm(this.principal(request), this.requestId(request), id, parsed.data); }
  @Delete("terms/:id") deleteTerm(@Req() request: EducoreRequest, @Param("id") id: string) { return this.academics.deleteTerm(this.principal(request), this.requestId(request), id); }
  @Get("classes/:classId/arms") arms(@Req() request: EducoreRequest, @Param("classId") classId: string) { return this.academics.arms(this.principal(request), classId); }
  @Post("classes/:classId/arms") createArm(@Req() request: EducoreRequest, @Param("classId") classId: string, @Body() body: unknown) { const parsed = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(body); if (!parsed.success) throw new BadRequestException("A valid arm is required"); return this.academics.createArm(this.principal(request), this.requestId(request), classId, parsed.data.name); }
  @Patch("arms/:id") updateArm(@Req() request: EducoreRequest, @Param("id") id: string, @Body() body: unknown) { const parsed = z.object({ name: z.string().trim().min(1).max(100) }).safeParse(body); if (!parsed.success) throw new BadRequestException("A valid arm update is required"); return this.academics.updateArm(this.principal(request), this.requestId(request), id, parsed.data.name); }
  @Delete("arms/:id") deleteArm(@Req() request: EducoreRequest, @Param("id") id: string) { return this.academics.deleteArm(this.principal(request), this.requestId(request), id); }

  private principal(request: EducoreRequest) { const principal = request.educoreContext?.principal; if (!principal) throw new BadRequestException("Authenticated request context was not initialized"); return principal; }
  private requestId(request: EducoreRequest) { return request.educoreContext?.requestId ?? "unknown"; }
}
