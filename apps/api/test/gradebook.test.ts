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
  let classId: string;
  let armId: string;
  let sessionId: string;
  let termId: string;
  let subjectId: string;
  let gradebookId: string;
  let studentId1: string;
  let studentId2: string;

  console.log("Setting up gradebook test data...");

  // Create school
  const schoolRes = await db.insert(schema.schools).values({ name: "Test School", slug: `test-school-${Date.now()}` }).returning();
  schoolId = schoolRes[0].id;

  // Create academic session
  const sessionRes = await db
    .insert(schema.academicSessions)
    .values({ schoolId, name: "2024" })
    .returning();
  sessionId = sessionRes[0].id;

  // Create academic term
  const termRes = await db
    .insert(schema.academicTerms)
    .values({
      sessionId,
      name: "Term 1",
      startsAt: new Date("2024-01-01"),
      endsAt: new Date("2024-03-31"),
    })
    .returning();
  termId = termRes[0].id;

  // Create academic class
  const classRes = await db
    .insert(schema.academicClasses)
    .values({ schoolId, name: "Senior 1" })
    .returning();
  classId = classRes[0].id;

  // Create academic arm
  const armRes = await db
    .insert(schema.academicArms)
    .values({ classId, name: "A" })
    .returning();
  armId = armRes[0].id;

  // Create subject
  const subjectRes = await db
    .insert(schema.academicSubjects)
    .values({ schoolId, code: "ENG", name: "English Language" })
    .returning();
  subjectId = subjectRes[0].id;

  // Create gradebook
  const gradebookRes = await db
    .insert(schema.gradebooks)
    .values({
      schoolId,
      classId,
      armId,
      sessionId,
      termId,
      subjectId,
      componentPolicy: [
        { name: "CA1", weight: 10 },
        { name: "CA2", weight: 10 },
        { name: "Assignment", weight: 20 },
        { name: "Exam", weight: 60 },
      ],
    })
    .returning();
  gradebookId = gradebookRes[0].id;

  // Create students
  const student1Res = await db
    .insert(schema.students)
    .values({
      schoolId,
      admissionNo: "ADM001",
      firstName: "John",
      lastName: "Doe",
      status: "approved",
    })
    .returning();
  studentId1 = student1Res[0].id;

  const student2Res = await db
    .insert(schema.students)
    .values({
      schoolId,
      admissionNo: "ADM002",
      firstName: "Jane",
      lastName: "Smith",
      status: "approved",
    })
    .returning();
  studentId2 = student2Res[0].id;

  console.log("✓ Test data created");

  // Test 1: Create gradebook with component policy
  console.log("Running test: create gradebook with component policy...");
  const gradebook = await db.query.gradebooks.findFirst({
    where: eq(schema.gradebooks.id, gradebookId),
  });
  assert(gradebook, "Gradebook should exist");
  assert.deepEqual(gradebook.componentPolicy, [
    { name: "CA1", weight: 10 },
    { name: "CA2", weight: 10 },
    { name: "Assignment", weight: 20 },
    { name: "Exam", weight: 60 },
  ]);
  console.log("✓ Gradebook created with correct component policy");

  // Test 2: Set grades for a student
  console.log("Running test: set grades for a student...");
  const scores = {
    CA1: 8,
    CA2: 9,
    Assignment: 15,
    Exam: 58,
  };

  const gradeRowRes = await db
    .insert(schema.gradeRows)
    .values({
      gradebookId,
      studentId: studentId1,
      scores,
    })
    .returning();
  assert.deepEqual(gradeRowRes[0].scores, scores);
  console.log("✓ Grades set for student 1");

  // Test 3: List all grade rows for a gradebook
  console.log("Running test: list all grade rows for a gradebook...");
  // Set grades for second student
  await db
    .insert(schema.gradeRows)
    .values({
      gradebookId,
      studentId: studentId2,
      scores: { CA1: 7, CA2: 8, Assignment: 16, Exam: 55 },
    });

  const gradeRows = await db.query.gradeRows.findMany({
    where: eq(schema.gradeRows.gradebookId, gradebookId),
  });

  assert.equal(gradeRows.length, 2, "Should have 2 grade rows");
  assert.deepEqual(gradeRows.map((r) => r.studentId), [studentId1, studentId2]);
  console.log("✓ Listed grade rows correctly");

  // Test 4: Get a specific grade row
  console.log("Running test: get a specific grade row...");
  const gradeRow = await db.query.gradeRows.findFirst({
    where: and(eq(schema.gradeRows.gradebookId, gradebookId), eq(schema.gradeRows.studentId, studentId1)),
  });

  assert(gradeRow, "Grade row should exist");
  assert.deepEqual(gradeRow.scores, {
    CA1: 8,
    CA2: 9,
    Assignment: 15,
    Exam: 58,
  });
  console.log("✓ Retrieved specific grade row");

  // Test 5: Update grade row with new scores
  console.log("Running test: update grade row with new scores...");
  const newScores = { CA1: 9, CA2: 10, Assignment: 18, Exam: 60 };

  const updated = await db
    .update(schema.gradeRows)
    .set({ scores: newScores, updatedAt: new Date() })
    .where(
      and(
        eq(schema.gradeRows.gradebookId, gradebookId),
        eq(schema.gradeRows.studentId, studentId1),
      ),
    )
    .returning();

  assert.deepEqual(updated[0].scores, newScores);
  console.log("✓ Updated grade row scores");

  // Test 6: Fetch gradebook with academic details
  console.log("Running test: fetch gradebook with academic details...");
  const gradebookWithDetails = await db
    .select({
      id: schema.gradebooks.id,
      className: schema.academicClasses.name,
      armName: schema.academicArms.name,
      sessionName: schema.academicSessions.name,
      termName: schema.academicTerms.name,
      subjectName: schema.academicSubjects.name,
      policy: schema.gradebooks.componentPolicy,
    })
    .from(schema.gradebooks)
    .innerJoin(schema.academicClasses, eq(schema.academicClasses.id, schema.gradebooks.classId))
    .innerJoin(schema.academicArms, eq(schema.academicArms.id, schema.gradebooks.armId))
    .innerJoin(schema.academicSessions, eq(schema.academicSessions.id, schema.gradebooks.sessionId))
    .leftJoin(schema.academicTerms, eq(schema.academicTerms.id, schema.gradebooks.termId))
    .leftJoin(schema.academicSubjects, eq(schema.academicSubjects.id, schema.gradebooks.subjectId))
    .where(eq(schema.gradebooks.id, gradebookId))
    .limit(1);

  assert(gradebookWithDetails[0], "Gradebook with details should exist");
  assert.equal(gradebookWithDetails[0].className, "Senior 1");
  assert.equal(gradebookWithDetails[0].armName, "A");
  assert.equal(gradebookWithDetails[0].sessionName, "2024");
  assert.equal(gradebookWithDetails[0].termName, "Term 1");
  assert.equal(gradebookWithDetails[0].subjectName, "English Language");
  console.log("✓ Fetched gradebook with academic details");

  // Test 7: Fetch grade rows with student names
  console.log("Running test: fetch grade rows with student names...");
  const gradeRowsWithNames = await db
    .select({
      id: schema.gradeRows.id,
      scores: schema.gradeRows.scores,
      studentFirstName: schema.students.firstName,
      studentLastName: schema.students.lastName,
    })
    .from(schema.gradeRows)
    .leftJoin(schema.students, eq(schema.students.id, schema.gradeRows.studentId))
    .where(eq(schema.gradeRows.gradebookId, gradebookId));

  assert.equal(gradeRowsWithNames.length, 2, "Should have 2 grade rows with names");
  assert.equal(gradeRowsWithNames[0].studentFirstName, "John");
  assert.equal(gradeRowsWithNames[0].studentLastName, "Doe");
  assert.equal(gradeRowsWithNames[1].studentFirstName, "Jane");
  assert.equal(gradeRowsWithNames[1].studentLastName, "Smith");
  console.log("✓ Fetched grade rows with student names");

  console.log("\n✓ All gradebook tests passed!");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
