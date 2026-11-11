import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { loadEnv } from "../src/common/env.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const client = postgres(loadEnv().DATABASE_URL);
const db = drizzle(client, { schema });

async function runTests() {
  const suffix = Date.now().toString();
  const [school] = await db.insert(schema.schools).values({ slug: `movement-${suffix}`, name: "Movement Test School" }).returning();
  const [session] = await db.insert(schema.academicSessions).values({ schoolId: school.id, name: `2026-${suffix}` }).returning();
  const [user] = await db.insert(schema.users).values({ email: `movement-${suffix}@example.test`, displayName: "Movement Admin", status: "active" }).returning();
  const [student] = await db.insert(schema.students).values({
    schoolId: school.id,
    admissionNo: `MOV-${suffix}`,
    firstName: "Mia",
    lastName: "Movement",
    status: "approved",
  }).returning();

  const [movement] = await db.insert(schema.studentMovements).values({
    schoolId: school.id,
    studentId: student.id,
    sessionId: session.id,
    decision: "retain",
    effectiveDate: new Date("2026-09-01"),
    reason: "Additional academic support required",
    decidedByUserId: user.id,
  }).returning();
  assert.equal(movement.decision, "retain");

  const stored = await db.select().from(schema.studentMovements).where(eq(schema.studentMovements.id, movement.id));
  assert.equal(stored.length, 1);
  assert.equal(stored[0].studentId, student.id);
  console.log("✓ Promotion/retention/graduation movement persistence validated");
  await client.end();
}

runTests().catch(async (error) => {
  console.error("Movement test failed:", error);
  await client.end();
  process.exit(1);
});
