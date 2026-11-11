import assert from "node:assert/strict";
import postgres from "postgres";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`question-bank-${suffix}`}, 'Question Bank Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`question-author-${suffix}@example.test`}, 'Question Author', 'active') returning id`;
    userId = String(user["id"]);
    const [item] = await sql`insert into question_bank_items (school_id, code, tags, created_by_user_id) values (${schoolId}, 'SCI-001', ${JSON.stringify(["science", "revision"])}, ${userId}) returning id, status`;
    const itemId = String(item["id"]);
    const [version] = await sql`insert into question_bank_versions (question_id, version, type, prompt, options, correct_answer, points, created_by_user_id) values (${itemId}, 1, 'single_choice', 'What is H2O?', ${JSON.stringify(["Water", "Oxygen"])}, 'Water', 1, ${userId}) returning id, status`;
    const versionId = String(version["id"]);
    assert.equal(item["status"], "draft");
    assert.equal(version["status"], "draft");
    const [reviewed] = await sql`update question_bank_versions set status = 'reviewed', reviewed_by_user_id = ${userId}, reviewed_at = now() where id = ${versionId} and status = 'draft' returning status`;
    await sql`update question_bank_items set status = 'reviewed' where id = ${itemId} and status = 'draft'`;
    assert.equal(reviewed["status"], "reviewed");
    const [retired] = await sql`update question_bank_items set status = 'retired', retired_by_user_id = ${userId}, retired_at = now() where id = ${itemId} and status = 'reviewed' returning status`;
    assert.equal(retired["status"], "retired");
    console.log("✓ Question bank version, review, and retirement persistence validated");
  } finally {
    if (schoolId) await sql`delete from schools where id = ${schoolId}`;
    if (userId) await sql`delete from users where id = ${userId}`;
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
