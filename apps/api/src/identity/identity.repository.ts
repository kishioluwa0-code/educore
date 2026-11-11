import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import {
  capabilities,
  membershipRoles,
  roleCapabilities,
  roles as rolesTable,
  schoolMemberships,
  sessions,
  userCredentials,
  users,
} from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";
import { SessionService } from "./session.service.js";
import type { AuthenticatedPrincipal } from "./types.js";

export type PasswordUser = {
  userId: string;
  email: string;
  displayName: string;
  passwordHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  mustChangePassword: boolean;
};

export type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class IdentityRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionService) private readonly sessionService: SessionService,
  ) {}

  async findPasswordUserByEmail(email: string): Promise<PasswordUser | undefined> {
    const [user] = await this.database.db
      .select({
        userId: users.id,
        email: users.email,
        displayName: users.displayName,
        passwordHash: userCredentials.passwordHash,
        failedAttempts: userCredentials.failedAttempts,
        lockedUntil: userCredentials.lockedUntil,
        mustChangePassword: userCredentials.mustChangePassword,
      })
      .from(users)
      .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
      .where(and(eq(users.email, email.trim().toLowerCase()), eq(users.status, "active")))
      .limit(1);
    return user;
  }

  async recordFailedLogin(userId: string, now = new Date()): Promise<void> {
    await this.database.db
      .update(userCredentials)
      .set({
        failedAttempts: sql`${userCredentials.failedAttempts} + 1`,
        lockedUntil: sql`case when ${userCredentials.failedAttempts} + 1 >= 5 then ${now} + interval '15 minutes' else ${userCredentials.lockedUntil} end`,
        updatedAt: now,
      })
      .where(eq(userCredentials.userId, userId));
  }

  async resetFailedLogins(userId: string, now = new Date()): Promise<void> {
    await this.database.db
      .update(userCredentials)
      .set({ failedAttempts: 0, lockedUntil: null, updatedAt: now })
      .where(eq(userCredentials.userId, userId));
  }

  async setPassword(userId: string, passwordHash: string, mustChangePassword: boolean): Promise<void> {
    const now = new Date();
    await this.database.db.update(userCredentials).set({ passwordHash, mustChangePassword, passwordChangedAt: now, failedAttempts: 0, lockedUntil: null, updatedAt: now }).where(eq(userCredentials.userId, userId));
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    activeSchoolId: string | undefined,
    metadata: SessionMetadata,
  ): Promise<void> {
    await this.database.db.insert(sessions).values({
      userId,
      tokenHash,
      expiresAt,
      activeSchoolId,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    });
  }

  async revokeSession(tokenHash: string, now = new Date()): Promise<void> {
    await this.database.db
      .update(sessions)
      .set({ revokedAt: now })
      .where(and(eq(sessions.tokenHash, tokenHash), isNull(sessions.revokedAt)));
  }

  async findPrincipalByUserId(userId: string): Promise<AuthenticatedPrincipal | undefined> {
    const [user] = await this.database.db
      .select({ userId: users.id, email: users.email, displayName: users.displayName, platformRole: users.platformRole })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, "active")))
      .limit(1);
    if (!user) return undefined;
    const [credential] = await this.database.db.select({ mustChangePassword: userCredentials.mustChangePassword }).from(userCredentials).where(eq(userCredentials.userId, userId)).limit(1);
    return this.hydratePrincipal({ ...user, mustChangePassword: credential?.mustChangePassword ?? false });
  }

  async findPrincipalBySessionToken(token: string): Promise<AuthenticatedPrincipal | undefined> {
    if (!token.trim()) return undefined;
    const [session] = await this.database.db
      .select({ userId: sessions.userId, activeSchoolId: sessions.activeSchoolId })
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, this.sessionService.hash(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) return undefined;

    const principal = await this.findPrincipalByUserId(session.userId);
    return principal
      ? { ...principal, activeSchoolId: session.activeSchoolId ?? undefined }
      : undefined;
  }

  private async hydratePrincipal(user: {
    userId: string;
    email: string;
    displayName: string;
    platformRole?: string | null;
    mustChangePassword?: boolean;
  }): Promise<AuthenticatedPrincipal> {
    const memberships = await this.database.db
      .select({
        membershipId: schoolMemberships.id,
        schoolId: schoolMemberships.schoolId,
        status: schoolMemberships.status,
      })
      .from(schoolMemberships)
      .where(eq(schoolMemberships.userId, user.userId));

    const membershipIds = memberships.map((membership) => membership.membershipId);
    const allRoleRows = membershipIds.length
      ? await this.database.db
          .select({
            membershipId: membershipRoles.membershipId,
            roleId: membershipRoles.roleId,
            roleKey: rolesTable.key,
          })
          .from(membershipRoles)
          .innerJoin(rolesTable, eq(rolesTable.id, membershipRoles.roleId))
          .where(inArray(membershipRoles.membershipId, membershipIds))
      : [];

    const roleIds = [...new Set(allRoleRows.map((row) => row.roleId))];
    const capabilityRows = roleIds.length
      ? await this.database.db
          .select({ roleId: roleCapabilities.roleId, capabilityKey: capabilities.key })
          .from(roleCapabilities)
          .innerJoin(capabilities, eq(capabilities.id, roleCapabilities.capabilityId))
          .where(inArray(roleCapabilities.roleId, roleIds))
      : [];

    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      memberships: memberships.map((membership) => ({
        membershipId: membership.membershipId,
        schoolId: membership.schoolId,
        status: membership.status,
        roleKeys: allRoleRows
          .filter((row) => row.membershipId === membership.membershipId)
          .map((row) => row.roleKey),
        capabilityKeys: [
          ...new Set(
            allRoleRows
              .filter((row) => row.membershipId === membership.membershipId)
              .flatMap((row) =>
                capabilityRows
                  .filter((capability) => capability.roleId === row.roleId)
                  .map((capability) => capability.capabilityKey),
              ),
          ),
        ],
      })),
      platformRole: user.platformRole === "superadmin" ? "superadmin" : undefined,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
