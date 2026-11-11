import { BadRequestException, Body, Controller, Get, Header, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { StudentService } from "./student.service.js";
import { StudentTransferService } from "./student-transfer.service.js";

const createStudentSchema = z.object({
  admissionNo: z.string().trim().min(1),
  firstName: z.string().trim().min(1),
  middleName: z.string().trim().optional(),
  lastName: z.string().trim().min(1),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().trim().optional(),
  nationality: z.string().trim().optional(),
  classId: z.string().trim().optional(),
  armId: z.string().trim().optional(),
  session: z.string().trim().optional(),
});

const updateStudentSchema = createStudentSchema.omit({ admissionNo: true }).partial();
const transferSchema = z.object({
  classId: z.string().trim().min(1),
  armId: z.string().trim().min(1),
  effectiveDate: z.coerce.date(),
  reason: z.string().trim().min(1),
});
const withdrawalSchema = z.object({ effectiveDate: z.coerce.date(), reason: z.string().trim().min(1) });

@Controller("students")
@UseGuards(AuthGuard)
export class StudentController {
  constructor(@Inject(StudentService) private readonly students: StudentService, @Inject(StudentTransferService) private readonly studentTransfer: StudentTransferService) {}

  @Get("export.csv")
  @Header("content-type", "text/csv; charset=utf-8")
  @Header("content-disposition", "attachment; filename=\"students.csv\"")
  async export(@Req() request: EducoreRequest) {
    return (await this.studentTransfer.exportCsv(this.principal(request), this.requestId(request))).csv;
  }

  @Post("import.csv")
  async import(@Req() request: EducoreRequest, @Body() body: unknown) {
    if (typeof body !== "string") throw new BadRequestException("CSV import body must be plain text");
    return this.studentTransfer.importCsv(this.principal(request), this.requestId(request), body);
  }

  @Get()
  list(@Req() request: EducoreRequest) {
    return this.students.list(this.principal(request));
  }

  @Get(":studentId")
  find(@Req() request: EducoreRequest, @Param("studentId") studentId: string) {
    return this.students.find(this.principal(request), studentId);
  }

  @Post()
  create(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid student record is required");
    return this.students.create(
      this.principal(request),
      request.educoreContext?.requestId ?? "unknown",
      parsed.data,
    );
  }

  @Patch(":studentId")
  update(@Req() request: EducoreRequest, @Param("studentId") studentId: string, @Body() body: unknown) {
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid student update is required");
    return this.students.update(this.principal(request), this.requestId(request), studentId, parsed.data);
  }

  @Post(":studentId/approve")
  approve(@Req() request: EducoreRequest, @Param("studentId") studentId: string) {
    return this.students.approve(this.principal(request), this.requestId(request), studentId);
  }

  @Post(":studentId/transfer")
  transfer(@Req() request: EducoreRequest, @Param("studentId") studentId: string, @Body() body: unknown) {
    const parsed = transferSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid transfer is required");
    return this.students.transfer(this.principal(request), this.requestId(request), studentId, parsed.data.classId, parsed.data.armId, parsed.data.effectiveDate, parsed.data.reason);
  }

  @Post(":studentId/withdraw")
  withdraw(@Req() request: EducoreRequest, @Param("studentId") studentId: string, @Body() body: unknown) {
    const parsed = withdrawalSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid withdrawal is required");
    return this.students.withdraw(this.principal(request), this.requestId(request), studentId, parsed.data.effectiveDate, parsed.data.reason);
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