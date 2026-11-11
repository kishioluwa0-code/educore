import assert from "node:assert/strict";
import postgres from "postgres";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`exam-snapshot-${suffix}`}, 'Exam Snapshot Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`exam-snapshot-${suffix}@example.test`}, 'Exam Snapshot User', 'active') returning id`;
    userId = String(user["id"]);
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const [pool] = await sql`insert into cbt_pools (school_id, code, name, mode, result_policy, status, created_by_user_id) values (${schoolId}, 'SCHOOL-SNAPSHOT', 'School Snapshot Pool', 'school', ${JSON.stringify({ showScore: false, showCorrectAnswers: false, release: "after_close" })}, 'published', ${userId}) returning id`;
    const [student] = await sql`insert into students (school_id, admission_no, first_name, last_name, status) values (${schoolId}, ${`SNAP-${suffix}`}, 'Frozen', 'Candidate', 'approved') returning id, first_name, last_name, admission_no, status`;
    const [configuration] = await sql`insert into exam_configurations (school_id, pool_id, session_id, code, name, opens_at, closes_at, created_by_user_id) values (${schoolId}, ${String(pool["id"])}, ${String(session["id"])}, 'EXAM-SNAPSHOT', 'Snapshot Exam', now() + interval '1 hour', now() + interval '2 hours', ${userId}) returning id, status`;
    await sql`insert into exam_candidates (configuration_id, student_id, snapshot) values (${String(configuration["id"])}, ${String(student["id"])}, ${JSON.stringify({ studentId: student["id"], admissionNo: student["admission_no"], firstName: student["first_name"], lastName: student["last_name"], status: student["status"] })})`;
    const [published] = await sql`update exam_configurations set status = 'published', snapshot_at = now(), published_by_user_id = ${userId} where id = ${String(configuration["id"])} and status = 'draft' returning status`;
    await sql`update students set first_name = 'Changed' where id = ${String(student["id"])}`;
    const [frozen] = await sql`select snapshot from exam_candidates where configuration_id = ${String(configuration["id"])} and student_id = ${String(student["id"])}`;
    assert.equal(published["status"], "published");
    const snapshot = typeof frozen["snapshot"] === "string" ? JSON.parse(frozen["snapshot"]) as { firstName: string } : frozen["snapshot"] as { firstName: string };
    assert.equal(snapshot.firstName, "Frozen");
    console.log("✓ Exam configuration and frozen candidate snapshot validated");
  } finally {
    if (schoolId) {
      await sql`delete from exam_candidates where configuration_id in (select id from exam_configurations where school_id = ${schoolId})`;
      await sql`delete from exam_configurations where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userId) await sql`delete from users where id = ${userId}`;
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
