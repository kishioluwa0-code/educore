import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { PasswordService } from "../identity/password.service.js";
import { DatabaseService } from "../database/database.module.js";
import { membershipRoles, roles, schoolMemberships, schoolSetup, schools, userCredentials, users } from "../../drizzle/schema.js";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { AuthGuard, type EducoreRequest } from "../identity/auth.guard.js";
import { SchoolService } from "./school.service.js";

const setupSchema = z.object({
  shortCode: z.string().trim().max(20).optional(), schoolType: z.string().trim().max(80).optional(), state: z.string().trim().max(80).optional(), officialPhone: z.string().trim().max(40).optional(), officialEmail: z.string().trim().email().optional(), logoUrl: z.string().trim().max(2_000_000).optional(), currentSession: z.string().trim().max(30).optional(), currentTerm: z.string().trim().max(30).optional(), setupStep: z.number().int().min(0).max(5).optional(), checklist: z.array(z.string()).optional(),
});
const registrationSchema = z.object({ schoolName: z.string().trim().min(2), adminName: z.string().trim().min(2), email: z.string().trim().email(), password: z.string().min(12) });
const platformUserSchema = z.object({ email: z.string().trim().email(), displayName: z.string().trim().min(2), password: z.string().min(12), platformRole: z.enum(["superadmin", "user"]).default("user") });

@Controller("school")
export class SchoolController {
  constructor(@Inject(SchoolService) private readonly schools: SchoolService, @Inject(DatabaseService) private readonly database: DatabaseService, @Inject(PasswordService) private readonly passwords: PasswordService) {}

  @Post("register")
  async register(@Body() body: unknown) {
    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("School name, administrator name, email, and a 12-character password are required");
    const slug = parsed.data.schoolName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const passwordHash = await this.passwords.hash(parsed.data.password);
    const result = await this.database.db.transaction(async (tx) => {
      const [school] = await tx.insert(schools).values({ slug, name: parsed.data.schoolName, status: "trial" }).returning({ id: schools.id });
      const [user] = await tx.insert(users).values({ email: parsed.data.email.toLowerCase(), displayName: parsed.data.adminName, status: "active" }).returning({ id: users.id });
      const [membership] = await tx.insert(schoolMemberships).values({ schoolId: school.id, userId: user.id, status: "active" }).returning({ id: schoolMemberships.id });
      const [role] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, "administrator")).limit(1);
      await tx.insert(userCredentials).values({ userId: user.id, passwordHash });
      await tx.insert(membershipRoles).values({ membershipId: membership.id, roleId: role.id });
      await tx.insert(schoolSetup).values({ schoolId: school.id, setupStep: 0, checklist: [] });
      return { schoolId: school.id, email: parsed.data.email.toLowerCase() };
    });
    return { ...result, status: "trial", next: "/" };
  }

  @Get("setup")
  @UseGuards(AuthGuard)
  get(@Req() request: EducoreRequest) { return this.schools.get(this.principal(request)); }

  @Patch("setup")
  @UseGuards(AuthGuard)
  save(@Req() request: EducoreRequest, @Body() body: unknown) {
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Valid school setup data is required");
    return this.schools.save(this.principal(request), request.educoreContext?.requestId ?? "unknown", parsed.data);
  }

  @Get("platform/schools")
  @UseGuards(AuthGuard)
  listSchools(@Req() request: EducoreRequest) { return this.schools.listForSuperadmin(this.principal(request)); }

  @Post("platform/schools/:schoolId/approve")
  @UseGuards(AuthGuard)
  approveSchool(@Req() request: EducoreRequest, @Param("schoolId") schoolId: string) {
    return this.schools.approve(this.principal(request), request.educoreContext?.requestId ?? "unknown", schoolId);
  }

  @Get("platform/users")
  @UseGuards(AuthGuard)
  async listPlatformUsers(@Req() request: EducoreRequest) {
    this.requireSuperadmin(request);
    return this.database.db.select({ id: users.id, email: users.email, displayName: users.displayName, status: users.status, platformRole: users.platformRole, createdAt: users.createdAt }).from(users).orderBy(desc(users.createdAt));
  }

  @Post("platform/users")
  @UseGuards(AuthGuard)
  async createPlatformUser(@Req() request: EducoreRequest, @Body() body: unknown) {
    this.requireSuperadmin(request);
    const parsed = platformUserSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException("Email, display name, and a 12-character password are required");
    const passwordHash = await this.passwords.hash(parsed.data.password);
    try {
      return await this.database.db.transaction(async (tx) => {
        const [user] = await tx.insert(users).values({ email: parsed.data.email.toLowerCase(), displayName: parsed.data.displayName, status: "active", platformRole: parsed.data.platformRole === "superadmin" ? "superadmin" : null }).returning({ id: users.id, email: users.email, displayName: users.displayName, status: users.status, platformRole: users.platformRole, createdAt: users.createdAt });
        await tx.insert(userCredentials).values({ userId: user.id, passwordHash, mustChangePassword: true });
        return user;
      });
    } catch (error) {
      if (error instanceof Error && error.message.toLowerCase().includes("users_email_unique")) throw new BadRequestException("That email is already registered");
      throw error;
    }
  }

  @Post("platform/users/:userId/reset-password")
  @UseGuards(AuthGuard)
  async resetPlatformUserPassword(@Req() request: EducoreRequest, @Param("userId") userId: string, @Body() body: unknown) {
    this.requireSuperadmin(request);
    const parsed = z.object({ password: z.string().min(12) }).safeParse(body);
    if (!parsed.success) throw new BadRequestException("A 12-character password is required");
    const [target] = await this.database.db.select({ platformRole: users.platformRole }).from(users).where(eq(users.id, userId)).limit(1);
    if (!target) throw new BadRequestException("User not found");
    if (target.platformRole === "superadmin") throw new ForbiddenException("Superadmin passwords cannot be reset here");
    const now = new Date();
    await this.database.db.update(userCredentials).set({ passwordHash: await this.passwords.hash(parsed.data.password), mustChangePassword: true, passwordChangedAt: now, updatedAt: now }).where(eq(userCredentials.userId, userId));
    return { status: "reset", mustChangePassword: true };
  }

  private requireSuperadmin(request: EducoreRequest) {
    if (request.educoreContext?.principal?.platformRole !== "superadmin") throw new ForbiddenException("Platform access is required");
  }

  private principal(request: EducoreRequest) {
    const principal = request.educoreContext?.principal;
    if (!principal) throw new BadRequestException("Authenticated request context was not initialized");
    return principal;
  }
}