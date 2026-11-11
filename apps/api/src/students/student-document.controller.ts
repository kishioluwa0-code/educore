import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { StudentDocumentService } from "./student-document.service.js";

const registerDocumentSchema = z.object({
  documentType: z.string().trim().min(1),
  requirementKey: z.string().trim().min(1),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1),
  byteSize: z.number().int().positive(),
});
const decisionSchema = z.object({ reason: z.string().trim().optional() });

@Controller("students/:studentId/documents")
@UseGuards(AuthGuard)
export class StudentDocumentController {
  constructor(@Inject(StudentDocumentService) private readonly documents: StudentDocumentService) {}

  @Get()
  list(@Req() request: EducoreRequest, @Param("studentId") studentId: string) {
    return this.documents.list(this.principal(request), studentId);
  }

  @Post()
  register(
    @Req() request: EducoreRequest,
    @Param("studentId") studentId: string,
    @Body() body: unknown,
  ) {
    const parsed = registerDocumentSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Valid document metadata is required");
    return this.documents.register(
      this.principal(request),
      this.requestId(request),
      studentId,
      parsed.data,
    );
  }

  @Post("upload")
  async upload(
    @Req() request: EducoreRequest,
    @Param("studentId") studentId: string,
    @Query("documentType") documentType = "",
    @Query("requirementKey") requirementKey = "",
  ) {
    const file = await request.file();
    if (!file || !documentType.trim() || !requirementKey.trim()) {
      throw new BadRequestException("A file, document type, and requirement key are required");
    }
    return this.documents.upload(
      this.principal(request),
      this.requestId(request),
      studentId,
      documentType,
      requirementKey,
      file.filename,
      file.mimetype,
      await file.toBuffer(),
    );
  }

  @Put(":documentId")
  async replace(@Req() request: EducoreRequest, @Param("documentId") documentId: string) {
    const file = await request.file();
    if (!file) throw new BadRequestException("A replacement file is required");
    return this.documents.replace(
      this.principal(request),
      this.requestId(request),
      documentId,
      file.filename,
      file.mimetype,
      await file.toBuffer(),
    );
  }

  @Get(":documentId/download")
  async download(
    @Req() request: EducoreRequest,
    @Param("documentId") documentId: string,
    @Res() response: FastifyReply,
  ) {
    const result = await this.documents.download(this.principal(request), documentId);
    if (result.url) {
      return response.redirect(result.url, 302);
    }
    response
      .type(result.document.mimeType)
      .header(
        "Content-Disposition",
        `attachment; filename="${result.document.originalFilename.replace(/"/g, "")}"`,
      )
      .send(result.data);
  }

  @Delete(":documentId")
  remove(@Req() request: EducoreRequest, @Param("documentId") documentId: string) {
    return this.documents.remove(this.principal(request), this.requestId(request), documentId);
  }

  @Post(":documentId/verify")
  verify(@Req() request: EducoreRequest, @Param("documentId") documentId: string) {
    return this.documents.decide(
      this.principal(request),
      this.requestId(request),
      documentId,
      "verified",
    );
  }

  @Post(":documentId/reject")
  reject(
    @Req() request: EducoreRequest,
    @Param("documentId") documentId: string,
    @Body() body: unknown,
  ) {
    const parsed = decisionSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A rejection reason is required");
    return this.documents.decide(
      this.principal(request),
      this.requestId(request),
      documentId,
      "rejected",
      parsed.data.reason,
    );
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal)
      throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }

  private requestId(request: EducoreRequest) {
    return request.educoreContext?.requestId ?? "unknown";
  }
}
