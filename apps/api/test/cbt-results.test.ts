import assert from "node:assert/strict";
import postgres from "postgres";
import { DatabaseService } from "../src/database/database.module.js";
import { ResultRepository } from "../src/exams/result.repository.js";
import { GradebookRepository } from "../src/gradebook/gradebook.repository.js";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  let resultId = "";
  const database = new DatabaseService();
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`result-${suffix}`}, 'Result Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`result-${suffix}@example.test`}, 'Result Examiner', 'active') returning id`;
    userId = String(user["id"]);
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const [academicClass] = await sql`insert into academic_classes (school_id, name) values (${schoolId}, 'Result Class') returning id`;
    const [arm] = await sql`insert into academic_arms (class_id, name) values (${String(academicClass["id"])}, 'A') returning id`;
    const [gradebook] = await sql`insert into gradebooks (school_id, class_id, arm_id, session_id, component_policy) values (${schoolId}, ${String(academicClass["id"])}, ${String(arm["id"])}, ${String(session["id"])}, ${JSON.stringify([{ name: "exam", weight: 100 }])}) returning id`;
    const [student] = await sql`insert into students (school_id, user_id, admission_no, first_name, last_name, status) values (${schoolId}, ${userId}, ${`RES-${suffix}`}, 'Result', 'Student', 'approved') returning id`;
    const [question] = await sql`insert into question_bank_items (school_id, code, tags, status, created_by_user_id) values (${schoolId}, 'RESULT-Q', ${JSON.stringify(["math"])}, 'reviewed', ${userId}) returning id`;
    const [version] = await sql`insert into question_bank_versions (question_id, version, type, prompt, options, correct_answer, points, status, created_by_user_id, reviewed_by_user_id, reviewed_at) values (${String(question["id"])}, 1, 'single_choice', 'Two plus two?', ${JSON.stringify(["3", "4"])}, '4', 2, 'reviewed', ${userId}, ${userId}, now()) returning id`;
    const [pool] = await sql`insert into cbt_pools (school_id, code, name, mode, result_policy, status, created_by_user_id) values (${schoolId}, 'RESULT-POOL', 'Result Pool', 'school', ${JSON.stringify({ showScore: true, showCorrectAnswers: false, release: "immediate" })}, 'published', ${userId}) returning id`;
    await sql`insert into cbt_pool_questions (pool_id, question_version_id, position) values (${String(pool["id"])}, ${String(version["id"])}, 1)`;
    const [configuration] = await sql`insert into exam_configurations (school_id, pool_id, session_id, code, name, gradebook_id, grade_component_key, opens_at, closes_at, status, snapshot_at, created_by_user_id) values (${schoolId}, ${String(pool["id"])}, ${String(session["id"])}, 'RESULT-EXAM', 'Result Exam', ${String(gradebook["id"])}, 'exam', now() - interval '1 hour', now() + interval '1 hour', 'published', now(), ${userId}) returning id`;
    const [candidate] = await sql`insert into exam_candidates (configuration_id, student_id, snapshot) values (${String(configuration["id"])}, ${String(student["id"])}, ${JSON.stringify({ studentId: student["id"] })}) returning id`;
    const [attempt] = await sql`insert into cbt_attempts (configuration_id, candidate_id, student_id, question_order, answers, status, expires_at) values (${String(configuration["id"])}, ${String(candidate["id"])}, ${String(student["id"])}, ${JSON.stringify([{ position: 1, questionVersionId: version["id"], type: "single_choice", options: ["3", "4"] }])}, ${JSON.stringify({ [String(version["id"])]: "4" })}, 'submitted', now() + interval '1 hour') returning id`;

    const repository = new ResultRepository(database);
    const marked = await repository.mark(schoolId, String(attempt["id"]), userId);
    resultId = marked.id;
    assert.equal(marked.score, 2);
    assert.equal(marked.maxScore, 2);
    assert.equal(marked.pendingManualCount, 0);
    assert.equal(marked.status, "marked");

    const published = await repository.publish(schoolId, marked.id, userId);
    assert.equal(published.status, "published");
    const replay = await repository.mark(schoolId, String(attempt["id"]), userId);
    assert.equal(replay.id, marked.id);
    const visible = await repository.findForRead(schoolId, marked.id);
    assert.equal(visible.score, 2);
    const [gradeRow] = await sql`select scores from grade_rows where gradebook_id = ${String(gradebook["id"])} and student_id = ${String(student["id"])}`;
    const [source] = await sql`select source_type, component_key, score from assessment_score_sources where source_id = ${marked.id}`;
    assert.deepEqual(gradeRow["scores"], { exam: 2 });
    assert.equal(source["source_type"], "cbt_result");
    assert.equal(source["component_key"], "exam");
    assert.equal(source["score"], 2);
    const gradebookRepository = new GradebookRepository(database);
    await assert.rejects(
      gradebookRepository.upsertGradeRow(String(gradebook["id"]), String(student["id"]), { exam: 1 }),
      /synchronized from CBT/,
    );
    console.log("✓ CBT objective marking, idempotent retry, and publication validated");
  } finally {
    if (schoolId) {
      if (resultId) await sql`delete from cbt_results where id = ${resultId}`;
      await sql`delete from assessment_score_sources where source_type = 'cbt_result' and source_id = ${resultId}`;
      await sql`delete from grade_rows where gradebook_id in (select id from gradebooks where school_id = ${schoolId})`;
      await sql`delete from gradebooks where school_id = ${schoolId}`;
      await sql`delete from academic_arms where class_id in (select id from academic_classes where school_id = ${schoolId})`;
      await sql`delete from academic_classes where school_id = ${schoolId}`;
      await sql`delete from cbt_attempts where configuration_id in (select id from exam_configurations where school_id = ${schoolId})`;
      await sql`delete from exam_candidates where configuration_id in (select id from exam_configurations where school_id = ${schoolId})`;
      await sql`delete from exam_configurations where school_id = ${schoolId}`;
      await sql`delete from cbt_pool_questions where pool_id in (select id from cbt_pools where school_id = ${schoolId})`;
      await sql`delete from question_bank_versions where question_id in (select id from question_bank_items where school_id = ${schoolId})`;
      await sql`delete from question_bank_items where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userId) await sql`delete from users where id = ${userId}`;
    await database.onModuleDestroy();
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
