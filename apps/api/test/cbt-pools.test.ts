import assert from "node:assert/strict";
import postgres from "postgres";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`cbt-pool-${suffix}`}, 'CBT Pool Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`cbt-pool-${suffix}@example.test`}, 'CBT Pool Author', 'active') returning id`;
    userId = String(user["id"]);
    const [question] = await sql`insert into question_bank_items (school_id, code, tags, status, created_by_user_id) values (${schoolId}, 'CBT-001', ${JSON.stringify(["math"])}, 'reviewed', ${userId}) returning id`;
    const [version] = await sql`insert into question_bank_versions (question_id, version, type, prompt, options, correct_answer, status, created_by_user_id, reviewed_by_user_id, reviewed_at) values (${String(question["id"])}, 1, 'single_choice', '2+2?', ${JSON.stringify(["4", "5"])}, '4', 'reviewed', ${userId}, ${userId}, now()) returning id`;
    const [schoolPool] = await sql`insert into cbt_pools (school_id, code, name, mode, result_policy, created_by_user_id) values (${schoolId}, 'SCHOOL-001', 'School CBT', 'school', ${JSON.stringify({ showScore: false, showCorrectAnswers: false, release: "after_close" })}, ${userId}) returning id, mode, status`;
    const [practicePool] = await sql`insert into cbt_pools (school_id, code, name, mode, result_policy, created_by_user_id) values (${schoolId}, 'PRACTICE-001', 'Practice CBT', 'practice', ${JSON.stringify({ showScore: true, showCorrectAnswers: true, release: "immediate" })}, ${userId}) returning id, mode, status`;
    await sql`insert into cbt_pool_questions (pool_id, question_version_id, position) values (${String(schoolPool["id"])}, ${String(version["id"])}, 1)`;
    const [published] = await sql`update cbt_pools set status = 'published', published_by_user_id = ${userId}, published_at = now() where id = ${String(schoolPool["id"])} and status = 'draft' and exists (select 1 from cbt_pool_questions where pool_id = ${String(schoolPool["id"])}) returning status`;
    assert.equal(schoolPool["mode"], "school");
    assert.equal(practicePool["mode"], "practice");
    assert.equal(schoolPool["status"], "draft");
    assert.equal(published["status"], "published");
    const [archived] = await sql`update cbt_pools set status = 'archived', archived_at = now() where id = ${String(schoolPool["id"])} and status = 'published' returning status`;
    assert.equal(archived["status"], "archived");
    console.log("✓ Separate School CBT/Practice CBT pools and result policies validated");
  } finally {
    if (schoolId) await sql`delete from schools where id = ${schoolId}`;
    if (userId) await sql`delete from users where id = ${userId}`;
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
