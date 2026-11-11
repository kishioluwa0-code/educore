import assert from "node:assert/strict";
import postgres from "postgres";
import { DatabaseService } from "../src/database/database.module.js";
import { GradebookRepository } from "../src/gradebook/gradebook.repository.js";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  let gradebookId = "";
  const database = new DatabaseService();
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`correction-${suffix}`}, 'Correction Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`correction-${suffix}@example.test`}, 'Correction Admin', 'active') returning id`;
    userId = String(user["id"]);
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const [academicClass] = await sql`insert into academic_classes (school_id, name) values (${schoolId}, 'Correction Class') returning id`;
    const [arm] = await sql`insert into academic_arms (class_id, name) values (${String(academicClass["id"])}, 'A') returning id`;
    const [student] = await sql`insert into students (school_id, user_id, admission_no, first_name, last_name, status) values (${schoolId}, ${userId}, ${`COR-${suffix}`}, 'Correction', 'Student', 'approved') returning id`;
    const [gradebook] = await sql`insert into gradebooks (school_id, class_id, arm_id, session_id, component_policy) values (${schoolId}, ${String(academicClass["id"])}, ${String(arm["id"])}, ${String(session["id"])}, ${JSON.stringify([{ name: "ca1", weight: 100 }])}) returning id`;
    gradebookId = String(gradebook["id"]);
    const [submission] = await sql`insert into gradebook_submissions (gradebook_id, status, published_at, published_by_user_id) values (${gradebookId}, 'published', now(), ${userId}) returning id`;
    const [row] = await sql`insert into grade_rows (gradebook_id, student_id, scores, score_sources) values (${gradebookId}, ${String(student["id"])}, ${JSON.stringify({ ca1: 10 })}, ${JSON.stringify({ ca1: { type: "manual", editable: true } })}) returning id`;
    await sql`insert into grade_snapshots (gradebook_submission_id, student_id, scores) values (${String(submission["id"])}, ${String(student["id"])}, ${JSON.stringify({ ca1: 10 })})`;
    const repository = new GradebookRepository(database);
    const corrected = await repository.upsertGradeRow(gradebookId, String(student["id"]), { ca1: 15 }, undefined, true, userId);
    assert.equal((corrected.scores as Record<string, number>)["ca1"], 15);
    const [state] = await sql`select manual_correction_used from gradebook_submissions where id = ${String(submission["id"])}`;
    assert.equal(state["manual_correction_used"], true);
    await assert.rejects(repository.upsertGradeRow(gradebookId, String(student["id"]), { ca1: 20 }, undefined, true, userId), /already been used/);
    console.log("✓ Single administrator post-publication correction and permanent lock validated");
  } finally {
    if (schoolId) {
      await sql`delete from grade_snapshots where gradebook_submission_id in (select id from gradebook_submissions where gradebook_id in (select id from gradebooks where school_id = ${schoolId}))`;
      await sql`delete from gradebook_submissions where gradebook_id in (select id from gradebooks where school_id = ${schoolId})`;
      await sql`delete from grade_rows where gradebook_id in (select id from gradebooks where school_id = ${schoolId})`;
      await sql`delete from gradebooks where school_id = ${schoolId}`;
      await sql`delete from academic_arms where class_id in (select id from academic_classes where school_id = ${schoolId})`;
      await sql`delete from academic_classes where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userId) await sql`delete from users where id = ${userId}`;
    await database.onModuleDestroy();
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
