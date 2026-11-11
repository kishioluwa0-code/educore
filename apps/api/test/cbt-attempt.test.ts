import assert from "node:assert/strict";
import postgres from "postgres";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`attempt-${suffix}`}, 'Attempt Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`attempt-${suffix}@example.test`}, 'Attempt Student', 'active') returning id`;
    userId = String(user["id"]);
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const [student] = await sql`insert into students (school_id, user_id, admission_no, first_name, last_name, status) values (${schoolId}, ${userId}, ${`ATT-${suffix}`}, 'Attempt', 'Student', 'approved') returning id`;
    const [pool] = await sql`insert into cbt_pools (school_id, code, name, mode, status, created_by_user_id) values (${schoolId}, 'ATTEMPT-POOL', 'Attempt Pool', 'practice', 'published', ${userId}) returning id`;
    const [configuration] = await sql`insert into exam_configurations (school_id, pool_id, session_id, code, name, opens_at, closes_at, status, snapshot_at, created_by_user_id) values (${schoolId}, ${String(pool["id"])}, ${String(session["id"])}, 'ATTEMPT-EXAM', 'Attempt Exam', now() - interval '1 minute', now() + interval '1 hour', 'published', now(), ${userId}) returning id`;
    const [candidate] = await sql`insert into exam_candidates (configuration_id, student_id, snapshot) values (${String(configuration["id"])}, ${String(student["id"])}, ${JSON.stringify({ studentId: student["id"], firstName: "Attempt" })}) returning id`;
    const [attempt] = await sql`insert into cbt_attempts (configuration_id, candidate_id, student_id, question_order, expires_at) values (${String(configuration["id"])}, ${String(candidate["id"])}, ${String(student["id"])}, ${JSON.stringify([{ position: 1, questionVersionId: "q-1", options: ["A", "B"] }])}, now() + interval '1 hour') returning id, status, last_autosave_sequence`;
    const [saved] = await sql`insert into cbt_autosaves (attempt_id, operation_id, sequence, answers) values (${String(attempt["id"])}, 'attempt-op-001', 1, ${JSON.stringify({ "q-1": "A" })}) returning sequence`;
    await sql`update cbt_attempts set answers = ${JSON.stringify({ "q-1": "A" })}, last_autosave_sequence = 1 where id = ${String(attempt["id"])} and status = 'active' and last_autosave_sequence = 0`;
    const [retry] = await sql`select id from cbt_autosaves where attempt_id = ${String(attempt["id"])} and operation_id = 'attempt-op-001'`;
    const [event] = await sql`insert into cbt_attempt_events (attempt_id, operation_id, sequence, event_type, occurred_at, metadata) values (${String(attempt["id"])}, 'event-op-001', 1, 'disconnected', now(), ${JSON.stringify({ reason: "network" })}) returning event_type, sequence`;
    await sql`update cbt_attempts set last_event_sequence = 1 where id = ${String(attempt["id"])} and last_event_sequence = 0`;
    const [eventRetry] = await sql`select id from cbt_attempt_events where attempt_id = ${String(attempt["id"])} and operation_id = 'event-op-001'`;
    const [recovery] = await sql`select event_type, sequence from cbt_attempt_events where attempt_id = ${String(attempt["id"])} and sequence > 0 order by sequence`;
    const [submitted] = await sql`update cbt_attempts set status = 'submitted', submitted_at = now() where id = ${String(attempt["id"])} and status = 'active' returning status`;
    assert.equal(attempt["status"], "active");
    assert.equal(attempt["last_autosave_sequence"], 0);
    assert.equal(saved["sequence"], 1);
    assert.ok(retry["id"]);
    assert.equal(event["event_type"], "disconnected");
    assert.equal(event["sequence"], 1);
    assert.ok(eventRetry["id"]);
    assert.equal(recovery["event_type"], "disconnected");
    assert.equal(recovery["sequence"], 1);
    assert.equal(submitted["status"], "submitted");
    console.log("✓ CBT attempt timing, deterministic payload, autosave replay, and submission validated");
  } finally {
    if (schoolId) {
      await sql`delete from cbt_attempts where configuration_id in (select id from exam_configurations where school_id = ${schoolId})`;
      await sql`delete from exam_candidates where configuration_id in (select id from exam_configurations where school_id = ${schoolId})`;
      await sql`delete from exam_configurations where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userId) await sql`delete from users where id = ${userId}`;
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
