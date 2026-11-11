import {
  BadRequestException,
  Body,
  Inject,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "./auth.guard.js";
import { AuthService } from "./auth.service.js";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./session.service.js";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
  activeSchoolId: z.string().uuid().optional(),
});
const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(12) });

@Controller("auth")
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post("sign-in")
  @HttpCode(200)
  async signIn(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const parsed = signInSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A valid email and password are required");

    const result = await this.authService.signIn(parsed.data, {
      requestId:
        (Array.isArray(request.headers["x-request-id"])
          ? request.headers["x-request-id"][0]
          : request.headers["x-request-id"]) ?? "unknown",
      userAgent: request.headers["user-agent"],
      ipAddress: request.ip,
    });

    response.setCookie(SESSION_COOKIE, result.token, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });

    return {
      expiresAt: result.expiresAt,
      principal: result.principal,
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  me(@Req() request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new Error("Authenticated request context was not initialized");
    return principal;
  }

  @Post("change-password")
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async changePassword(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = passwordChangeSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("A new password with at least 12 characters is required");
    const userId = request.educoreContext?.principal?.userId;
    if (!userId) throw new BadRequestException("Authenticated request context was not initialized");
    await this.authService.changePassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
  }

  @Post("sign-out")
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async signOut(
    @Req() request: EducoreRequest,
    @Res({ passthrough: true }) response: FastifyReply,
  ) {
    const token = request.cookies?.[SESSION_COOKIE];
    await this.authService.signOut(token);
    response.clearCookie(SESSION_COOKIE, { path: "/" });
  }
}
