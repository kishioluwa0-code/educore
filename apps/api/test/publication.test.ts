import assert from "node:assert/strict";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { loadEnv } from "../src/common/env.js";
import * as schema from "../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

const client = postgres(loadEnv().DATABASE_URL);
const db = drizzle(client, { schema });

async function runTests() {
  let schoolId: string;
  let gradebookId: string;
  let gradebookSubmissionId: string;

  console.log("Setting up publication test data...");

  // Create school
  const suffix = Date.now().toString();
  const schoolRes = await db.insert(schema.schools).values({ name: "Test School", slug: `test-school-${suffix}` }).returning();
  schoolId = schoolRes[0].id;

  const teacherRes = await db
    .insert(schema.users)
    .values({ email: `publication-teacher-${suffix}@example.test`, displayName: "Publication Teacher", status: "active" })
    .returning();
  const adminRes = await db
    .insert(schema.users)
    .values({ email: `publication-admin-${suffix}@example.test`, displayName: "Publication Admin", status: "active" })
    .returning();
  const teacherUserId = teacherRes[0].id;
  const adminUserId = adminRes[0].id;

  // Create academic session
  const sessionRes = await db
    .insert(schema.academicSessions)
    .values({ schoolId, name: "2024" })
    .returning();
  const sessionId = sessionRes[0].id;

  // Create academic class
  const classRes = await db.insert(schema.academicClasses).values({ schoolId, name: "Senior 1" }).returning();
  const classId = classRes[0].id;

  // Create academic arm
  const armRes = await db
    .insert(schema.academicArms)
    .values({ classId, name: "A" })
    .returning();
  const armId = armRes[0].id;

  // Create gradebook
  const gradebookRes = await db
    .insert(schema.gradebooks)
    .values({
      schoolId,
      classId,
      armId,
      sessionId,
      componentPolicy: [
        { name: "CA1", weight: 10 },
        { name: "CA2", weight: 10 },
        { name: "Exam", weight: 80 },
      ],
    })
    .returning();
  gradebookId = gradebookRes[0].id;

  // Create student
  const studentRes = await db
    .insert(schema.students)
    .values({
      schoolId,
      admissionNo: "ADM001",
      firstName: "Alice",
      lastName: "Johnson",
      status: "approved",
    })
    .returning();
  const studentId = studentRes[0].id;

  // Set initial grades
  await db
    .insert(schema.gradeRows)
    .values({
      gradebookId,
      studentId,
      scores: { CA1: 8, CA2: 9, Exam: 75 },
    });

  console.log("✓ Test data created");

  // Test 1: Create submission record (draft status)
  console.log("Running test: create submission record...");
  const submissionRes = await db
    .insert(schema.gradebookSubmissions)
    .values({
      gradebookId,
      status: "draft",
    })
    .returning();
  gradebookSubmissionId = submissionRes[0].id;
  assert.equal(submissionRes[0].status, "draft");
  console.log("✓ Submission created with draft status");

  // Test 2: Submit gradebook (status → submitted)
  console.log("Running test: submit gradebook...");
  const submittedRes = await db
    .update(schema.gradebookSubmissions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      submittedByUserId: teacherUserId,
      updatedAt: new Date(),
    })
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .returning();
  assert.equal(submittedRes[0].status, "submitted");
  assert(submittedRes[0].submittedAt);
  console.log("✓ Gradebook submitted for review");

  // Test 3: Request modification (status → modificationRequested)
  console.log("Running test: request modification...");
  const feedback = { comment: "Please review CA1 scores", corrections: [] };
  const modificationRes = await db
    .update(schema.gradebookSubmissions)
    .set({
      status: "modificationRequested",
      reviewedAt: new Date(),
      reviewedByUserId: adminUserId,
      reviewFeedback: feedback,
      updatedAt: new Date(),
    })
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .returning();
  assert.equal(modificationRes[0].status, "modificationRequested");
  assert.deepEqual(modificationRes[0].reviewFeedback, feedback);
  console.log("✓ Modification requested with feedback");

  // Test 4: Resubmit after correction
  console.log("Running test: resubmit after correction...");
  // Update grades with corrections
  await db
    .update(schema.gradeRows)
    .set({
      scores: { CA1: 9, CA2: 9, Exam: 75 },
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.gradeRows.gradebookId, gradebookId),
        eq(schema.gradeRows.studentId, studentId),
      ),
    );

  // Resubmit
  const resubmittedRes = await db
    .update(schema.gradebookSubmissions)
    .set({
      status: "submitted",
      submittedAt: new Date(),
      submittedByUserId: teacherUserId,
      updatedAt: new Date(),
    })
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .returning();
  assert.equal(resubmittedRes[0].status, "submitted");
  console.log("✓ Gradebook resubmitted after corrections");

  // Test 5: Approve gradebook (status → approved)
  console.log("Running test: approve gradebook...");
  const approvedRes = await db
    .update(schema.gradebookSubmissions)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedByUserId: adminUserId,
      reviewFeedback: null,
      updatedAt: new Date(),
    })
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .returning();
  assert.equal(approvedRes[0].status, "approved");
  console.log("✓ Gradebook approved for publication");

  // Test 6: Create immutable snapshot on publication
  console.log("Running test: create publication snapshot...");
  const allGrades = await db
    .select()
    .from(schema.gradeRows)
    .where(eq(schema.gradeRows.gradebookId, gradebookId));

  await db.insert(schema.gradeSnapshots).values(
    allGrades.map((grade) => ({
      gradebookSubmissionId,
      studentId: grade.studentId,
      scores: grade.scores,
    })),
  );

  const publishedRes = await db
    .update(schema.gradebookSubmissions)
    .set({
      status: "published",
      publishedAt: new Date(),
      publishedByUserId: adminUserId,
      updatedAt: new Date(),
    })
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .returning();
  assert.equal(publishedRes[0].status, "published");
  assert(publishedRes[0].publishedAt);
  console.log("✓ Gradebook published with immutable snapshot");

  // Test 7: Verify snapshot contains corrected scores
  console.log("Running test: verify snapshot data...");
  const snapshots = await db
    .select({
      id: schema.gradeSnapshots.id,
      studentId: schema.gradeSnapshots.studentId,
      scores: schema.gradeSnapshots.scores,
      studentFirstName: schema.students.firstName,
    })
    .from(schema.gradeSnapshots)
    .leftJoin(schema.students, eq(schema.students.id, schema.gradeSnapshots.studentId))
    .where(eq(schema.gradeSnapshots.gradebookSubmissionId, gradebookSubmissionId));

  assert.equal(snapshots.length, 1);
  assert.deepEqual(snapshots[0].scores, { CA1: 9, CA2: 9, Exam: 75 });
  assert.equal(snapshots[0].studentFirstName, "Alice");
  console.log("✓ Snapshot contains corrected scores");

  // Test 8: Fetch complete publication record
  console.log("Running test: fetch complete publication record...");
  const publication = await db
    .select({
      id: schema.gradebookSubmissions.id,
      status: schema.gradebookSubmissions.status,
      submittedAt: schema.gradebookSubmissions.submittedAt,
      submittedByUserId: schema.gradebookSubmissions.submittedByUserId,
      reviewedAt: schema.gradebookSubmissions.reviewedAt,
      reviewedByUserId: schema.gradebookSubmissions.reviewedByUserId,
      publishedAt: schema.gradebookSubmissions.publishedAt,
      publishedByUserId: schema.gradebookSubmissions.publishedByUserId,
    })
    .from(schema.gradebookSubmissions)
    .where(eq(schema.gradebookSubmissions.id, gradebookSubmissionId))
    .limit(1);

  assert.equal(publication[0].status, "published");
  assert(publication[0].submittedAt);
  assert.equal(publication[0].submittedByUserId, teacherUserId);
  assert(publication[0].reviewedAt);
  assert.equal(publication[0].reviewedByUserId, adminUserId);
  assert(publication[0].publishedAt);
  console.log("✓ Complete publication record retrieved");

  console.log("\n✓ All publication tests passed!");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
