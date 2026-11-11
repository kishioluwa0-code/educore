import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { PasswordService } from "../src/identity/password.service.js";

const apiUrl = process.env["EDUCORE_TEST_API_URL"] ?? "http://127.0.0.1:4000";
const password = process.env["EDUCORE_TEST_PASSWORD"] ?? "Attendance-Workflow-2026!";
const email = `attendance-${Date.now()}@example.test`;
const sql = postgres(process.env["DATABASE_URL"] ?? "postgres://postgres:postgres@localhost:5432/educore");
const idOf = (row: Record<string, unknown>) => String(row["id"]);

async function request(path: string, init: RequestInit = {}) {
  return fetch(`${apiUrl}${path}`, { ...init, headers: { accept: "application/json", ...init.headers } });
}

async function run() {
  const passwordHash = await new PasswordService().hash(password);
  let schoolId = "";
  let userId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`attendance-workflow-${Date.now()}`}, 'Attendance Workflow Test', 'active') returning id`;
    schoolId = idOf(school);
    const [user] = await sql`insert into users (email, display_name, status) values (${email}, 'Attendance Workflow Administrator', 'active') returning id`;
    userId = idOf(user);
    await sql`insert into user_credentials (user_id, password_hash) values (${userId}, ${passwordHash})`;
    const [membership] = await sql`insert into school_memberships (school_id, user_id, status) values (${schoolId}, ${userId}, 'active') returning id`;
    const [role] = await sql`select id from roles where key = 'administrator' limit 1`;
    await sql`insert into membership_roles (membership_id, role_id) values (${idOf(membership)}, ${idOf(role)})`;
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, '2026/2027', 'active') returning id`;
    const [term] = await sql`insert into academic_terms (session_id, name) values (${idOf(session)}, 'First Term') returning id`;
    const [academicClass] = await sql`insert into academic_classes (school_id, name, section) values (${schoolId}, 'Primary 1', 'Primary') returning id`;
    const [arm] = await sql`insert into academic_arms (class_id, name) values (${idOf(academicClass)}, 'A') returning id`;
    const [student] = await sql`insert into students (school_id, admission_no, first_name, last_name, class_id, arm_id, session) values (${schoolId}, 'ATT-001', 'Attendance', 'Student', ${idOf(academicClass)}, ${idOf(arm)}, '2026/2027') returning id`;

    const signIn = await request('/api/auth/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    assert.equal(signIn.status, 200);
    const cookie = signIn.headers.get('set-cookie');
    assert.ok(cookie);
    const sessionCookie = cookie.split(';')[0];
    const attendancePayload = { classId: idOf(academicClass), armId: idOf(arm), sessionId: idOf(session), termId: idOf(term), attendanceDate: '2026-09-09', entries: [{ studentId: idOf(student), status: 'absent', note: 'Did not attend' }] };
    const create = await request('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'attendance-retry-001', cookie: sessionCookie }, body: JSON.stringify(attendancePayload) });
    assert.equal(create.status, 201);
    const record = (await create.json()) as { id: string };
    const offlineInput = { ...attendancePayload, attendanceDate: '2026-09-10' };
    const sync = await request('/api/attendance/sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ operations: [{ operationId: 'offline-op-001', input: offlineInput }] }) });
    assert.equal(sync.status, 201);
    const synced = (await sync.json()) as { results: Array<{ status: string; attendanceRecordId: string }> };
    assert.equal(synced.results[0]?.status, 'applied');
    const syncRetry = await request('/api/attendance/sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ operations: [{ operationId: 'offline-op-001', input: offlineInput }] }) });
    assert.equal(syncRetry.status, 201);
    assert.equal(((await syncRetry.json()) as { results: Array<{ attendanceRecordId: string }> }).results[0]?.attendanceRecordId, synced.results[0]?.attendanceRecordId);
    const conflicted = await request('/api/attendance/sync', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ operations: [{ operationId: 'offline-op-002', input: { ...offlineInput, classId: randomUUID() } }] }) });
    assert.equal(conflicted.status, 201);
    assert.equal(((await conflicted.json()) as { results: Array<{ status: string }> }).results[0]?.status, 'conflict');
    const statuses = await request('/api/attendance/sync?status=conflict', { headers: { cookie: sessionCookie } });
    assert.equal(statuses.status, 200);
    assert.equal(((await statuses.json()) as Array<{ operationId: string }>).some((operation) => operation.operationId === 'offline-op-002'), true);
    const retry = await request('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'attendance-retry-001', cookie: sessionCookie }, body: JSON.stringify(attendancePayload) });
    assert.equal(retry.status, 201);
    assert.equal(((await retry.json()) as { id: string }).id, record.id);
    const conflict = await request('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'attendance-retry-001', cookie: sessionCookie }, body: JSON.stringify({ ...attendancePayload, entries: [{ studentId: idOf(student), status: 'present' }] }) });
    assert.equal(conflict.status, 409);
    assert.equal((await request('/api/attendance', { headers: { cookie: sessionCookie } })).status, 200);
    assert.equal((await request(`/api/attendance/${record.id}/submitted`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: '{}' })).status, 200);
    assert.equal((await request(`/api/attendance/${record.id}/returned`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: '{}' })).status, 409);
    assert.equal((await request(`/api/attendance/${record.id}/returned`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ reason: 'Correct the attendance note' }) })).status, 200);
    assert.equal((await request(`/api/attendance/${record.id}/submitted`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: '{}' })).status, 200);
    assert.equal((await request(`/api/attendance/${record.id}/approved`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: '{}' })).status, 200);
    const exception = await request('/api/attendance/exceptions', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ attendanceRecordId: record.id, studentId: idOf(student), kind: 'absence', note: 'Contact guardian' }) });
    assert.equal(exception.status, 201);
    const exceptionId = ((await exception.json()) as { id: string }).id;
    assert.equal((await request(`/api/attendance/exceptions/${exceptionId}/contacted`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ note: 'Guardian contacted' }) })).status, 200);
    assert.equal((await request(`/api/attendance/exceptions/${exceptionId}/resolved`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sessionCookie }, body: JSON.stringify({ note: 'Resolved' }) })).status, 200);
    console.log('attendance lifecycle and exception workflow passed');
  } finally {
    if (schoolId) {
      await sql`delete from membership_roles where membership_id in (select id from school_memberships where school_id = ${schoolId})`;
      await sql`delete from school_memberships where school_id = ${schoolId}`;
      await sql`delete from schools where id = ${schoolId}`;
    }
    if (userId) {
      await sql`delete from user_credentials where user_id = ${userId}`;
      await sql`delete from users where id = ${userId}`;
    }
    await sql.end();
  }
}

run().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
