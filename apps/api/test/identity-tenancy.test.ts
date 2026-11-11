import assert from "node:assert/strict";
import { AuthorizationService } from "../src/authorization/authorization.service.js";
import { TenantContextService } from "../src/tenancy/tenant-context.service.js";
import { SessionService, SESSION_TTL_SECONDS } from "../src/identity/session.service.js";
import { SYSTEM_ROLE_CAPABILITIES } from "../src/authorization/role-catalog.js";
import { PasswordService } from "../src/identity/password.service.js";
import type { AuthenticatedPrincipal } from "../src/identity/types.js";

const authorization = new AuthorizationService();
const tenancy = new TenantContextService();
const sessions = new SessionService();
const passwords = new PasswordService();

const principal: AuthenticatedPrincipal = {
  userId: "user-1",
  email: "admin@local.school",
  displayName: "School Administrator",
  memberships: [
    {
      membershipId: "membership-1",
      schoolId: "school-1",
      status: "active",
      roleKeys: ["school_administrator"],
      capabilityKeys: ["school.read", "student.read", "student.manage"],
    },
    {
      membershipId: "membership-2",
      schoolId: "school-2",
      status: "revoked",
      roleKeys: ["teacher"],
      capabilityKeys: ["student.read"],
    },
  ],
};

assert.throws(() => authorization.requirePrincipal(undefined), /Authentication is required/);
assert.equal(authorization.requireMembership(principal, "school-1").membershipId, "membership-1");
assert.throws(() => authorization.requireMembership(principal, "school-2"), /not an active member/);
assert.equal(
  authorization.requireCapability(principal, "school-1", "student.manage").schoolId,
  "school-1",
);
assert.throws(
  () => authorization.requireCapability(principal, "school-1", "finance.post"),
  /Missing capability: finance.post/,
);
assert.throws(
  () => authorization.requireScope(principal, { schoolId: "school-2" }),
  /not an active member/,
);
assert.throws(() => authorization.requireScope(principal, { userId: "user-2" }), /user scope/);
assert.equal(tenancy.resolveActiveMembership(principal).schoolId, "school-1");
assert.equal(tenancy.resolveActiveMembership(principal, "school-1").schoolId, "school-1");
assert.throws(() => tenancy.resolveActiveMembership(principal, "school-2"), /not available/);

const multiSchoolPrincipal: AuthenticatedPrincipal = {
  ...principal,
  memberships: [
    principal.memberships[0]!,
    {
      membershipId: "membership-3",
      schoolId: "school-3",
      status: "active",
      roleKeys: ["teacher"],
      capabilityKeys: ["student.read"],
    },
  ],
};
assert.throws(() => tenancy.resolveActiveMembership(multiSchoolPrincipal), /must be selected/);

const issuedAt = new Date("2026-09-04T00:00:00.000Z");
const issued = sessions.issue(issuedAt);
assert.equal(
  issued.expiresAt.toISOString(),
  new Date(issuedAt.getTime() + SESSION_TTL_SECONDS * 1000).toISOString(),
);
assert.notEqual(issued.token, issued.tokenHash);
assert.equal(sessions.matches(issued.token, issued.tokenHash), true);
assert.equal(sessions.matches("different-token", issued.tokenHash), false);
assert.equal(SYSTEM_ROLE_CAPABILITIES.administrator.includes("finance.post"), true);
assert.equal(SYSTEM_ROLE_CAPABILITIES.teacher.includes("gradebook.write"), true);
assert.equal(SYSTEM_ROLE_CAPABILITIES.teacher.includes("gradebook.approve"), false);
assert.equal(SYSTEM_ROLE_CAPABILITIES.parent.includes("student.read"), true);
assert.equal(SYSTEM_ROLE_CAPABILITIES.parent.includes("student.manage"), false);
assert.equal(SYSTEM_ROLE_CAPABILITIES.student.includes("finance.post"), false);

async function runAsyncAssertions() {
  const passwordHash = await passwords.hash("correct horse battery staple");
  assert.equal(await passwords.verify("correct horse battery staple", passwordHash), true);
  assert.equal(await passwords.verify("incorrect password", passwordHash), false);
  await assert.rejects(() => passwords.hash("short"), /at least 12 characters/);
}

void runAsyncAssertions()
  .then(() => console.log("identity-tenancy authorization tests passed"))
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
