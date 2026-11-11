import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { PublicationService } from "./publication.service.js";

const feedbackSchema = z.object({
  comment: z.string().min(1).max(1000),
  corrections: z.array(z.object({ component: z.string(), suggestion: z.string() })).optional(),
});

@Controller("gradebooks")
@UseGuards(AuthGuard)
export class PublicationController {
  constructor(@Inject(PublicationService) private readonly service: PublicationService) {}

  @Post(":gradebookId/submit")
  async submit(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const requestId = this.requestId(request);
    return this.service.submitGradebook(principal, requestId, gradebookId);
  }

  @Get(":gradebookId/submission")
  async getStatus(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    return this.service.getSubmissionStatus(principal, gradebookId);
  }

  @Patch(":gradebookId/submission/review")
  async review(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string, @Body() body: unknown) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const parsed = z
      .object({
        action: z.enum(["approve", "requestModification"]),
        feedback: feedbackSchema.optional(),
      })
      .safeParse(body);
    if (!parsed.success) throw new BadRequestException("Invalid review request");

    const requestId = this.requestId(request);
    return this.service.reviewGradebook(principal, requestId, gradebookId, parsed.data.action, parsed.data.feedback);
  }

  @Post(":gradebookId/publish")
  async publish(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    const requestId = this.requestId(request);
    return this.service.publishGradebook(principal, requestId, gradebookId);
  }

  @Get(":gradebookId/published")
  async getPublished(@Req() request: EducoreRequest, @Param("gradebookId") gradebookId: string) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Unauthorized");

    return this.service.getPublishedSnapshot(principal, gradebookId);
  }

  private requestId(request: EducoreRequest) {
    const header = request.headers["x-request-id"];
    return (Array.isArray(header) ? header[0] : header) || "unknown";
  }
}
