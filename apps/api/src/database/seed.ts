import { and, eq, inArray } from "drizzle-orm";
import { loadEnv } from "../common/env.js";
import { SYSTEM_ROLE_CAPABILITIES, SYSTEM_ROLES } from "../authorization/role-catalog.js";
import {
  capabilities,
  membershipRoles,
  roleCapabilities,
  roles,
  schoolMemberships,
  schools,
  userCredentials,
  users,
} from "../../drizzle/schema.js";
import { createDatabase } from "./client.js";
import { PasswordService } from "../identity/password.service.js";

const CAPABILITY_LABELS: Record<string, { label: string; domain: string }> = {
  "school.read": { label: "Read school context", domain: "school" },
  "school.manage": { label: "Manage school governance", domain: "school" },
  "school.approve": { label: "Approve schools on the EduCore platform", domain: "platform" },
  "membership.read": { label: "Read school memberships", domain: "identity" },
  "membership.manage": { label: "Manage school memberships", domain: "identity" },
  "student.read": { label: "Read student records", domain: "students" },
  "student.manage": { label: "Manage student records", domain: "students" },
  "student.approve": { label: "Approve student lifecycle actions", domain: "students" },
  "student.move": { label: "Approve promotion, retention, and graduation decisions", domain: "students" },
  "teacher.scope.read": { label: "Read assigned teaching scope", domain: "academics" },
  "academic.assignment.read": { label: "Read academic assignments", domain: "academics" },
  "academic.assignment.manage": { label: "Manage academic assignments", domain: "academics" },
  "academic.structure.read": { label: "Read academic structure", domain: "academics" },
  "academic.structure.manage": { label: "Manage academic structure", domain: "academics" },
  "attendance.read": { label: "Read attendance", domain: "attendance" },
  "attendance.write": { label: "Record attendance", domain: "attendance" },
  "attendance.approve": { label: "Approve attendance", domain: "attendance" },
  "gradebook.read": { label: "Read gradebooks", domain: "assessment" },
  "gradebook.write": { label: "Write assigned gradebooks", domain: "assessment" },
  "gradebook.approve": { label: "Approve gradebooks", domain: "assessment" },
  "finance.read": { label: "Read finance records", domain: "finance" },
  "finance.post": { label: "Post finance transactions", domain: "finance" },
  "finance.approve": { label: "Approve finance workflows", domain: "finance" },
  "audit.read": { label: "Read audit events", domain: "audit" },
};

async function seed() {
  const adminPassword = process.env["SEED_ADMIN_PASSWORD"];
  if (!adminPassword || adminPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be supplied and contain at least 12 characters");
  }

  const adminEmail = (process.env["SEED_ADMIN_EMAIL"] ?? "admin@local.school")
    .trim()
    .toLowerCase();
  const schoolSlug = (process.env["SEED_SCHOOL_SLUG"] ?? "local-school")
    .trim()
    .toLowerCase();
  const schoolName = process.env["SEED_SCHOOL_NAME"] ?? "Local School";
  const passwordService = new PasswordService();
  const passwordHash = await passwordService.hash(adminPassword);
  const { client, db } = createDatabase(loadEnv().DATABASE_URL);

  try {
    await db.transaction(async (transaction) => {
      await transaction
        .insert(capabilities)
        .values(Object.entries(CAPABILITY_LABELS).map(([key, metadata]) => ({ key, ...metadata })))
        .onConflictDoNothing({ target: capabilities.key });

      await transaction
        .insert(roles)
        .values(SYSTEM_ROLES.map((role) => ({ ...role, isSystem: true })))
        .onConflictDoNothing({ target: roles.key });

      const capabilityRows = await transaction
        .select({ id: capabilities.id, key: capabilities.key })
        .from(capabilities);
      const roleRows = await transaction
        .select({ id: roles.id, key: roles.key })
        .from(roles)
        .where(
          inArray(
            roles.key,
            SYSTEM_ROLES.map((role) => role.key),
          ),
        );
      const capabilityIdByKey = new Map(capabilityRows.map((row) => [row.key, row.id]));
      const roleIdByKey = new Map(roleRows.map((row) => [row.key, row.id]));
      const assignments = Object.entries(SYSTEM_ROLE_CAPABILITIES).flatMap(
        ([roleKey, capabilityKeys]) => {
          const roleId = roleIdByKey.get(roleKey);
          if (!roleId) return [];
          return capabilityKeys.flatMap((capabilityKey) => {
            const capabilityId = capabilityIdByKey.get(capabilityKey);
            return capabilityId ? [{ roleId, capabilityId }] : [];
          });
        },
      );
      if (assignments.length)
        await transaction.insert(roleCapabilities).values(assignments).onConflictDoNothing();

      const [school] = await transaction
        .insert(schools)
        .values({ slug: schoolSlug, name: schoolName, status: "active" })
        .onConflictDoUpdate({
          target: schools.slug,
          set: { name: schoolName, status: "active", updatedAt: new Date() },
        })
        .returning({ id: schools.id });
      const schoolId =
        school?.id ??
        (
          await transaction
            .select({ id: schools.id })
            .from(schools)
            .where(eq(schools.slug, schoolSlug))
            .limit(1)
        )[0]?.id;
      if (!schoolId) throw new Error("Unable to seed the school");

      const [user] = await transaction
        .insert(users)
        .values({ email: adminEmail, displayName: "School Administrator", status: "active" })
        .onConflictDoUpdate({
          target: users.email,
          set: { displayName: "School Administrator", status: "active", updatedAt: new Date() },
        })
        .returning({ id: users.id });
      const userId =
        user?.id ??
        (
          await transaction
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, adminEmail))
            .limit(1)
        )[0]?.id;
      if (!userId) throw new Error("Unable to seed the administrator");

      await transaction
        .insert(userCredentials)
        .values({ userId, passwordHash, failedAttempts: 0 })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          set: {
            passwordHash,
            failedAttempts: 0,
            lockedUntil: null,
            passwordChangedAt: new Date(),
            updatedAt: new Date(),
          },
        });

      const [membership] = await transaction
        .insert(schoolMemberships)
        .values({ schoolId, userId, status: "active" })
        .onConflictDoUpdate({
          target: [schoolMemberships.schoolId, schoolMemberships.userId],
          set: { status: "active", updatedAt: new Date() },
        })
        .returning({ id: schoolMemberships.id });
      const membershipId =
        membership?.id ??
        (
          await transaction
            .select({ id: schoolMemberships.id })
            .from(schoolMemberships)
            .where(
              and(eq(schoolMemberships.schoolId, schoolId), eq(schoolMemberships.userId, userId)),
            )
            .limit(1)
        )[0]?.id;
      const administratorRoleId = roleIdByKey.get("administrator");
      if (!membershipId || !administratorRoleId)
        throw new Error("Unable to seed the administrator membership");
      await transaction
        .insert(membershipRoles)
        .values({ membershipId, roleId: administratorRoleId })
        .onConflictDoNothing();

      const superadminEmail = process.env["SEED_SUPERADMIN_EMAIL"]?.trim().toLowerCase();
      if (superadminEmail) {
        const [superadmin] = await transaction
          .insert(users)
          .values({ email: superadminEmail, displayName: "EduCore Super Administrator", status: "active", platformRole: "superadmin" })
          .onConflictDoUpdate({ target: users.email, set: { displayName: "EduCore Super Administrator", status: "active", updatedAt: new Date() } })
          .returning({ id: users.id });
        const superadminId = superadmin?.id ?? (await transaction.select({ id: users.id }).from(users).where(eq(users.email, superadminEmail)).limit(1))[0]?.id;
        if (!superadminId) throw new Error("Unable to seed the super administrator");
        await transaction.insert(userCredentials).values({ userId: superadminId, passwordHash, failedAttempts: 0 }).onConflictDoUpdate({ target: userCredentials.userId, set: { passwordHash, failedAttempts: 0, lockedUntil: null, updatedAt: new Date() } });
      }
    });
    console.log(`Seeded administrator ${adminEmail} for ${schoolName}`);
  } finally {
    await client.end();
  }
}

seed().catch((error: unknown) => {
  console.error("EduCore API seed failed", error);
  process.exitCode = 1;
});
