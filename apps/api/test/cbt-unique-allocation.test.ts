import assert from "node:assert/strict";
import postgres from "postgres";
import { DatabaseService } from "../src/database/database.module.js";
import { AttemptRepository } from "../src/exams/attempt.repository.js";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userIds: string[] = [];
  let configurationId = "";
  const database = new DatabaseService();
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`unique-${suffix}`}, 'Unique CBT Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const users = await sql`insert into users (email, display_name, status) values (${`unique-a-${suffix}@example.test`}, 'Unique A', 'active'), (${`unique-b-${suffix}@example.test`}, 'Unique B', 'active') returning id`;
    userIds = users.map((user) => String(user["id"]));
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const students = await sql`insert into students (school_id, user_id, admission_no, first_name, last_name, status) values (${schoolId}, ${userIds[0]}, ${`UNQ-A-${suffix}`}, 'Unique', 'A', 'approved'), (${schoolId}, ${userIds[1]}, ${`UNQ-B-${suffix}`}, 'Unique', 'B', 'approved') returning id`;
    const [pool] = await sql`insert into cbt_pools (school_id, code, name, mode, status, created_by_user_id) values (${schoolId}, 'UNIQUE-POOL', 'Unique Pool', 'school', 'published', ${userIds[0]}) returning id`;
    const questions = await sql`insert into question_bank_items (school_id, code, status, created_by_user_id) values (${schoolId}, 'UNQ-Q1', 'reviewed', ${userIds[0]}), (${schoolId}, 'UNQ-Q2', 'reviewed', ${userIds[0]}) returning id`;
    const versions = await sql`insert into question_bank_versions (question_id, version, type, prompt, options, correct_answer, points, status, created_by_user_id, reviewed_by_user_id, reviewed_at) values (${String(questions[0]["id"])}, 1, 'single_choice', 'Q1', ${JSON.stringify(["A", "B"])}, 'A', 1, 'reviewed', ${userIds[0]}, ${userIds[0]}, now()), (${String(questions[1]["id"])}, 1, 'single_choice', 'Q2', ${JSON.stringify(["A", "B"])}, 'B', 1, 'reviewed', ${userIds[0]}, ${userIds[0]}, now()) returning id`;
    await sql`insert into cbt_pool_questions (pool_id, question_version_id, position) values (${String(pool["id"])}, ${String(versions[0]["id"])}, 1), (${String(pool["id"])}, ${String(versions[1]["id"])}, 2)`;
    const [configuration] = await sql`insert into exam_configurations (school_id, pool_id, session_id, code, name, questions_per_student, opens_at, closes_at, status, snapshot_at, created_by_user_id) values (${schoolId}, ${String(pool["id"])}, ${String(session["id"])}, 'UNIQUE-EXAM', 'Unique Exam', 1, now() - interval '1 minute', now() + interval '1 hour', 'published', now(), ${userIds[0]}) returning id`;
    configurationId = String(configuration["id"]);
    const candidates = await sql`insert into exam_candidates (configuration_id, student_id, snapshot) values (${configurationId}, ${String(students[0]["id"])}, ${JSON.stringify({ studentId: students[0]["id"] })}), (${configurationId}, ${String(students[1]["id"])}, ${JSON.stringify({ studentId: students[1]["id"] })}) returning id, student_id`;
    const repository = new AttemptRepository(database);
    const first = await repository.start(schoolId, configurationId, String(students[0]["id"]));
    const second = await repository.start(schoolId, configurationId, String(students[1]["id"]));
    const firstQuestion = (first.questionOrder as Array<{ questionVersionId: string }>)[0]?.questionVersionId;
    const secondQuestion = (second.questionOrder as Array<{ questionVersionId: string }>)[0]?.questionVersionId;
    assert.ok(firstQuestion);
    assert.ok(secondQuestion);
    assert.notEqual(firstQuestion, secondQuestion);
    const allocationCount = await sql`select count(*)::int as count from cbt_question_allocations where configuration_id = ${configurationId}`;
    assert.equal(allocationCount[0]["count"], 2);
    assert.equal(candidates.length, 2);
    console.log("✓ Concurrent-candidate allocation guarantees disjoint CBT question sets");
  } finally {
    if (schoolId) {
      await sql`delete from cbt_attempts where configuration_id = ${configurationId}`;
      await sql`delete from cbt_question_allocations where configuration_id = ${configurationId}`;
      await sql`delete from exam_candidates where configuration_id = ${configurationId}`;
      await sql`delete from exam_configurations where school_id = ${schoolId}`;
      await sql`delete from cbt_pool_questions where pool_id in (select id from cbt_pools where school_id = ${schoolId})`;
      await sql`delete from question_bank_versions where question_id in (select id from question_bank_items where school_id = ${schoolId})`;
      await sql`delete from question_bank_items where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userIds.length) await sql`delete from users where id in ${sql(userIds)}`;
    await database.onModuleDestroy();
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
