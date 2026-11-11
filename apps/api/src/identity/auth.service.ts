import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import { IdentityRepository } from "./identity.repository.js";
import { PasswordService } from "./password.service.js";
import { SessionService } from "./session.service.js";
import type { AuthenticatedPrincipal } from "./types.js";

export type SignInInput = {
  email: string;
  password: string;
  activeSchoolId?: string;
};

export type SignInMetadata = {
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(IdentityRepository) private readonly identityRepository: IdentityRepository,
    @Inject(PasswordService) private readonly passwordService: PasswordService,
    @Inject(SessionService) private readonly sessionService: SessionService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  findPrincipal(sessionToken?: string): Promise<AuthenticatedPrincipal | undefined> {
    if (!sessionToken) return Promise.resolve(undefined);
    return this.identityRepository.findPrincipalBySessionToken(sessionToken);
  }

  async signIn(input: SignInInput, metadata: SignInMetadata) {
    const user = await this.identityRepository.findPasswordUserByEmail(input.email);
    const requestId = metadata.requestId ?? "unknown";
    const genericFailure = new UnauthorizedException("Invalid email or password");
    const auditBase = {
      action: "auth.sign_in",
      objectType: "session",
      objectId: null,
      outcome: "denied" as const,
      requestId,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    };

    if (!user) {
      await this.auditService.record({
        ...auditBase,
        schoolId: null,
        actorUserId: null,
        reason: "invalid_credentials",
      });
      throw genericFailure;
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditService.record({
        ...auditBase,
        schoolId: null,
        actorUserId: user.userId,
        reason: "account_locked",
      });
      throw new UnauthorizedException("Sign-in is temporarily unavailable. Try again later.");
    }

    const valid = await this.passwordService.verify(input.password, user.passwordHash);
    if (!valid) {
      await this.identityRepository.recordFailedLogin(user.userId);
      await this.auditService.record({
        ...auditBase,
        schoolId: null,
        actorUserId: user.userId,
        reason: "invalid_credentials",
      });
      throw genericFailure;
    }

    const principal = await this.identityRepository.findPrincipalByUserId(user.userId);
    if (!principal) throw genericFailure;

    if (input.activeSchoolId) {
      const membership = principal.memberships.find(
        (item) => item.schoolId === input.activeSchoolId && item.status === "active",
      );
      if (!membership) {
        await this.auditService.record({
          ...auditBase,
          schoolId: input.activeSchoolId,
          actorUserId: user.userId,
          reason: "school_membership_denied",
        });
        throw new UnauthorizedException("The selected school is not available");
      }
    }

    await this.identityRepository.resetFailedLogins(user.userId);
    const activeSchoolId =
      input.activeSchoolId ?? principal.memberships.find((item) => item.status === "active")?.schoolId;
    const issued = this.sessionService.issue();
    await this.identityRepository.createSession(
      user.userId,
      issued.tokenHash,
      issued.expiresAt,
      activeSchoolId,
      metadata,
    );
    await this.auditService.record({
      action: "auth.sign_in",
      objectType: "session",
      objectId: null,
      outcome: "allowed",
      schoolId: activeSchoolId ?? null,
      actorUserId: user.userId,
      reason: "credentials_verified",
      requestId,
      ipAddress: metadata.ipAddress ?? null,
      userAgent: metadata.userAgent ?? null,
    });

    return {
      token: issued.token,
      expiresAt: issued.expiresAt,
      principal: { ...principal, activeSchoolId },
    };
  }

  async signOut(sessionToken?: string): Promise<void> {
    if (sessionToken) {
      await this.identityRepository.revokeSession(this.sessionService.hash(sessionToken));
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const principal = await this.identityRepository.findPrincipalByUserId(userId);
    const user = principal ? await this.identityRepository.findPasswordUserByEmail(principal.email) : undefined;
    if (!user || user.userId !== userId || !(await this.passwordService.verify(currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("The current password is not valid");
    }
    await this.identityRepository.setPassword(userId, await this.passwordService.hash(newPassword), false);
  }
}
