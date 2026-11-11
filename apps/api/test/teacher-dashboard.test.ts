import assert from "node:assert/strict";
import postgres from "postgres";
import { PasswordService } from "../src/identity/password.service.js";

const apiUrl = process.env["EDUCORE_TEST_API_URL"] ?? "http://127.0.0.1:4000";
const password = process.env["EDUCORE_TEST_PASSWORD"] ?? "Teacher-Dashboard-2026!";
const email = `teacher-dashboard-${Date.now()}@example.test`;
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
    const [school] = await sql`insert into schools (slug, name, status) values (${`teacher-dashboard-${Date.now()}`}, 'Teacher Dashboard Test', 'active') returning id`;
    schoolId = idOf(school);
    const [user] = await sql`insert into users (email, display_name, status) values (${email}, 'Teacher Dashboard Teacher', 'active') returning id`;
    userId = idOf(user);
    await sql`insert into user_credentials (user_id, password_hash) values (${userId}, ${passwordHash})`;
    const [membership] = await sql`insert into school_memberships (school_id, user_id, status) values (${schoolId}, ${userId}, 'active') returning id`;
    const [role] = await sql`select id from roles where key = 'teacher' limit 1`;
    await sql`insert into membership_roles (membership_id, role_id) values (${idOf(membership)}, ${idOf(role)})`;
    const [session] = await sql`insert into academic_sessions (school_id, name, status) values (${schoolId}, '2026/2027', 'active') returning id`;
    const [term] = await sql`insert into academic_terms (session_id, name) values (${idOf(session)}, 'First Term') returning id`;
    const [academicClass] = await sql`insert into academic_classes (school_id, name, section) values (${schoolId}, 'Primary 1', 'Primary') returning id`;
    const [arm] = await sql`insert into academic_arms (class_id, name) values (${idOf(academicClass)}, 'A') returning id`;
    
    // Create teacher class assignment
    const today = new Date();
    const assignment = await sql`insert into teacher_class_assignments (school_id, teacher_user_id, class_id, arm_id, session_id, term_id, status, effective_from) values (${schoolId}, ${userId}, ${idOf(academicClass)}, ${idOf(arm)}, ${idOf(session)}, ${idOf(term)}, 'active', ${today}) returning id`;
    
    // Create a student for the attendance record
    const [student] = await sql`insert into students (school_id, admission_no, first_name, last_name, class_id, arm_id, session) values (${schoolId}, 'TDT-001', 'Dashboard', 'Student', ${idOf(academicClass)}, ${idOf(arm)}, '2026/2027') returning id`;

    // Sign in as teacher
    const signIn = await request('/api/auth/sign-in', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
    assert.equal(signIn.status, 200);
    const cookie = signIn.headers.get('set-cookie');
    assert.ok(cookie);
    const sessionCookie = cookie.split(';')[0];

    // Create draft attendance records (these should appear in task queue)
    const attendancePayload = { classId: idOf(academicClass), armId: idOf(arm), sessionId: idOf(session), termId: idOf(term), attendanceDate: '2026-09-09', entries: [{ studentId: idOf(student), status: 'present' }] };
    const attendanceResult = await request('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'teacher-dashboard-test-001', cookie: sessionCookie }, body: JSON.stringify(attendancePayload) });
    assert.equal(attendanceResult.status, 201);

    // Create another draft attendance for a different date
    const attendancePayload2 = { classId: idOf(academicClass), armId: idOf(arm), sessionId: idOf(session), termId: idOf(term), attendanceDate: '2026-09-10', entries: [{ studentId: idOf(student), status: 'absent' }] };
    const attendanceResult2 = await request('/api/attendance', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': 'teacher-dashboard-test-002', cookie: sessionCookie }, body: JSON.stringify(attendancePayload2) });
    assert.equal(attendanceResult2.status, 201);

    // Get teacher dashboard tasks
    const tasksResponse = await request('/api/teacher/dashboard/tasks', { headers: { cookie: sessionCookie } });
    assert.equal(tasksResponse.status, 200);
    const tasks = (await tasksResponse.json()) as { attendance: Array<{ type: string; title: string; status: string; action: string }> };
    assert.ok(Array.isArray(tasks.attendance));
    assert.equal(tasks.attendance.length, 2, `Expected 2 pending attendance tasks, got ${tasks.attendance.length}`);
    assert.ok(tasks.attendance.every((t) => t.type === "attendance"));
    assert.ok(tasks.attendance.every((t) => t.status === "draft"));
    assert.ok(tasks.attendance.every((t) => t.action === "submit"));
    console.log('teacher dashboard task queue passed');
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
