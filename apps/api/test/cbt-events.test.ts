import assert from "node:assert/strict";
import postgres from "postgres";

const sql = postgres(process.env["DATABASE_URL"] ?? "******localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`event-${suffix}`}, 'Event Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const [user] = await sql`insert into users (email, display_name, status) values (${`event-${suffix}@example.test`}, 'Event Student', 'active') returning id`;
    userId = String(user["id"]);
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, ${`2026-${suffix}`}, 'active') returning id`;
    const [student] = await sql`insert into students (school_id, user_id, admission_no, first_name, last_name, status) values (${schoolId}, ${userId}, ${`EVT-${suffix}`}, 'Event', 'Student', 'approved') returning id`;
    const [pool] = await sql`insert into cbt_pools (school_id, code, name, mode, status, created_by_user_id) values (${schoolId}, 'EVENT-POOL', 'Event Pool', 'practice', 'published', ${userId}) returning id`;
    const [configuration] = await sql`insert into exam_configurations (school_id, pool_id, session_id, code, name, opens_at, closes_at, status, snapshot_at, created_by_user_id) values (${schoolId}, ${String(pool["id"])}, ${String(session["id"])}, 'EVENT-EXAM', 'Event Exam', now() - interval '1 minute', now() + interval '1 hour', 'published', now(), ${userId}) returning id`;
    const [candidate] = await sql`insert into exam_candidates (configuration_id, student_id, snapshot) values (${String(configuration["id"])}, ${String(student["id"])}, ${JSON.stringify({ studentId: student["id"] })}) returning id`;
    const [attempt] = await sql`insert into cbt_attempts (configuration_id, candidate_id, student_id, question_order, expires_at) values (${String(configuration["id"])}, ${String(candidate["id"])}, ${String(student["id"])}, ${JSON.stringify([{ position: 1, questionVersionId: "q-1", options: ["A", "B"] }])}, now() + interval '1 hour') returning id`;
    const attemptId = String(attempt["id"]);
    const [first] = await sql`insert into cbt_attempt_events (attempt_id, operation_id, sequence, event_type, occurred_at, metadata) values (${attemptId}, 'event-op-001', 1, 'disconnected', now(), ${JSON.stringify({ reason: "network" })}) returning event_type, sequence`;
    await sql`update cbt_attempts set last_event_sequence = 1 where id = ${attemptId} and last_event_sequence = 0`;
    const [second] = await sql`insert into cbt_attempt_events (attempt_id, operation_id, sequence, event_type, occurred_at, metadata) values (${attemptId}, 'event-op-002', 2, 'reconnected', now(), ${JSON.stringify({ recovered: true })}) returning event_type, sequence`;
    await sql`update cbt_attempts set last_event_sequence = 2 where id = ${attemptId} and last_event_sequence = 1`;
    const replay = await sql`select id from cbt_attempt_events where attempt_id = ${attemptId} and operation_id = 'event-op-001'`;
    const recovery = await sql`select event_type, sequence from cbt_attempt_events where attempt_id = ${attemptId} and sequence > 1 order by sequence`;
    assert.equal(first["event_type"], "disconnected");
    assert.equal(second["event_type"], "reconnected");
    assert.equal(second["sequence"], 2);
    assert.equal(replay.length, 1);
    assert.equal(recovery.length, 1);
    assert.equal(recovery[0]["event_type"], "reconnected");
    console.log("✓ CBT reconnect recovery and proctoring event persistence validated");
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
