import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { and, eq, sql } from "drizzle-orm";
import { loadEnv } from "../src/common/env.js";
import { CAPABILITIES } from "../src/authorization/capabilities.js";
import { SYSTEM_ROLE_CAPABILITIES } from "../src/authorization/role-catalog.js";
import * as schema from "../drizzle/schema.js";

assert(SYSTEM_ROLE_CAPABILITIES.teacher.includes(CAPABILITIES.gradebookRead));
assert(SYSTEM_ROLE_CAPABILITIES.teacher.includes(CAPABILITIES.gradebookWrite));
assert(!SYSTEM_ROLE_CAPABILITIES.teacher.includes(CAPABILITIES.gradebookApprove));
assert(SYSTEM_ROLE_CAPABILITIES.principal.includes(CAPABILITIES.gradebookApprove));

const client = postgres(loadEnv().DATABASE_URL);
const db = drizzle(client, { schema });

async function run() {
  const suffix = Date.now().toString();
  const [school] = await db.insert(schema.schools).values({ slug: `assessment-${suffix}`, name: "Assessment Test School" }).returning();
  const [session] = await db.insert(schema.academicSessions).values({ schoolId: school.id, name: `2026-${suffix}` }).returning();
  const [academicClass] = await db.insert(schema.academicClasses).values({ schoolId: school.id, name: `Class-${suffix}` }).returning();
  const [arm] = await db.insert(schema.academicArms).values({ classId: academicClass.id, name: "A" }).returning();
  const [student] = await db.insert(schema.students).values({ schoolId: school.id, admissionNo: `ASSESS-${suffix}`, firstName: "Concurrency", lastName: "Student", status: "approved" }).returning();
  const [gradebook] = await db.insert(schema.gradebooks).values({ schoolId: school.id, classId: academicClass.id, armId: arm.id, sessionId: session.id, componentPolicy: [{ name: "Exam", weight: 100 }] }).returning();
  const [row] = await db.insert(schema.gradeRows).values({ gradebookId: gradebook.id, studentId: student.id, scores: { Exam: 50 } }).returning();

  const first = await db.select({ version: schema.gradeRows.version }).from(schema.gradeRows).where(eq(schema.gradeRows.id, row.id));
  const expectedVersion = first[0].version;
  const updates = await Promise.all([
    db.update(schema.gradeRows).set({ scores: { Exam: 60 }, version: sql`${schema.gradeRows.version} + 1` }).where(and(eq(schema.gradeRows.id, row.id), eq(schema.gradeRows.version, expectedVersion))).returning(),
    db.update(schema.gradeRows).set({ scores: { Exam: 70 }, version: sql`${schema.gradeRows.version} + 1` }).where(and(eq(schema.gradeRows.id, row.id), eq(schema.gradeRows.version, expectedVersion))).returning(),
  ]);
  assert.equal(updates.filter((result) => result.length === 1).length, 1);
  console.log("✓ Assessment authorization matrix and optimistic concurrency validation passed");
  await client.end();
}

run().catch(async (error) => {
  console.error("Assessment authorization/concurrency test failed:", error);
  await client.end();
  process.exit(1);
});
