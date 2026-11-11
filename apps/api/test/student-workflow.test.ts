import assert from "node:assert/strict";

const apiUrl = process.env["EDUCORE_TEST_API_URL"] ?? "http://127.0.0.1:4000";
const email = process.env["EDUCORE_TEST_EMAIL"] ?? "admin@local.school";
const password = process.env["EDUCORE_TEST_PASSWORD"];

if (!password) {
  throw new Error("EDUCORE_TEST_PASSWORD must be supplied for the live student workflow test");
}

async function request(path: string, init: RequestInit = {}) {
  return fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { accept: "application/json", ...init.headers },
  });
}

async function run() {
  const signIn = await request("/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(signIn.status, 200, "seeded administrator sign-in should succeed");
  const initialPrincipal = (await signIn.json()) as {
    principal: { memberships: Array<{ schoolId: string; status: string }> };
  };
  const activeSchools = initialPrincipal.principal.memberships.filter(
    (membership) => membership.status === "active",
  );
  const schoolId = activeSchools[0]?.schoolId;
  const secondSchoolId = activeSchools[1]?.schoolId;
  assert.ok(schoolId, "seeded administrator should have an active school");
  assert.ok(secondSchoolId, "two active schools should be available for isolation testing");

  const activeSignIn = await request("/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, activeSchoolId: schoolId }),
  });
  assert.equal(activeSignIn.status, 200, "active school sign-in should succeed");
  const cookie = activeSignIn.headers.get("set-cookie");
  assert.ok(cookie, "sign-in should issue a session cookie");
  const sessionCookie = cookie.split(";")[0];

  const setupBefore = await request("/api/school/setup", {
    headers: { cookie: sessionCookie },
  });
  assert.equal(setupBefore.status, 200, "administrator setup should be readable");
  const setupSave = await request("/api/school/setup", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ setupStep: 1, checklist: ["profile"] }),
  });
  assert.equal(setupSave.status, 200, "administrator setup should be writable");
  const setupAfter = (await setupSave.json()) as {
    setup: { setupStep: number; checklist: string[] };
  };
  assert.equal(setupAfter.setup.setupStep, 1);
  assert.deepEqual(setupAfter.setup.checklist, ["profile"]);

  const admissionNo = `LIVE-${Date.now()}`;
  const payload = {
    admissionNo,
    firstName: "Live",
    lastName: "Workflow",
    dateOfBirth: "2014-05-12",
    gender: "Female",
    classId: "JSS 1",
    armId: "A",
    session: "2026/2027",
  };
  const create = await request("/api/students", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify(payload),
  });
  assert.equal(create.status, 201, "student creation should persist through the API");
  const student = (await create.json()) as { id: string; admissionNo: string; status: string };
  assert.match(student.id, /^[0-9a-f-]{36}$/i);
  assert.equal(student.admissionNo, admissionNo);
  assert.equal(student.status, "pending");

  const duplicate = await request("/api/students", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify(payload),
  });
  const duplicateBody = await duplicate.text();
  assert.equal(
    duplicate.status,
    409,
    `duplicate admission numbers must be rejected: ${duplicateBody}`,
  );

  const detail = await request(`/api/students/${student.id}`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(detail.status, 200, "created student should be readable in the same session");
  const persisted = (await detail.json()) as { id: string; admissionNo: string };
  assert.equal(persisted.id, student.id);
  assert.equal(persisted.admissionNo, admissionNo);

  const secondSchoolSignIn = await request("/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, activeSchoolId: secondSchoolId }),
  });
  assert.equal(secondSchoolSignIn.status, 200, "second-school sign-in should succeed");
  const secondSchoolCookie = secondSchoolSignIn.headers.get("set-cookie");
  assert.ok(secondSchoolCookie, "second-school sign-in should issue a session cookie");
  const crossSchoolRead = await request(`/api/students/${student.id}`, {
    headers: { cookie: secondSchoolCookie.split(";")[0] },
  });
  assert.equal(crossSchoolRead.status, 404, "cross-school student reads must be denied");

  const blockedApproval = await request(`/api/students/${student.id}/approve`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  assert.equal(blockedApproval.status, 409, "approval must require verified documents");

  const documentIds: string[] = [];
  for (const [documentType, requirementKey, filename, mimeType] of [
    ["Birth certificate", "birth_certificate", "birth.pdf", "application/pdf"],
    ["Passport photograph", "passport_photo", "passport.png", "image/png"],
  ] as const) {
    const form = new FormData();
    form.append("file", new Blob([`live-${requirementKey}`], { type: mimeType }), filename);
    const upload = await request(
      `/api/students/${student.id}/documents/upload?documentType=${encodeURIComponent(documentType)}&requirementKey=${requirementKey}`,
      { method: "POST", headers: { cookie: sessionCookie }, body: form },
    );
    assert.equal(upload.status, 201, `${documentType} upload should persist`);
    const document = (await upload.json()) as { id: string; status: string };
    assert.equal(document.status, "pending");
    documentIds.push(document.id);
  }

  const documents = await request(`/api/students/${student.id}/documents`, {
    headers: { cookie: sessionCookie },
  });
  assert.equal(documents.status, 200, "student documents should be readable");
  assert.equal(((await documents.json()) as unknown[]).length, 2);

  for (const documentId of documentIds) {
    const verification = await request(
      `/api/students/${student.id}/documents/${documentId}/verify`,
      { method: "POST", headers: { cookie: sessionCookie } },
    );
    assert.equal(verification.status, 201, "document verification should persist");
  }

  const approval = await request(`/api/students/${student.id}/approve`, {
    method: "POST",
    headers: { cookie: sessionCookie },
  });
  assert.equal(approval.status, 201, "verified student should be approvable");
  assert.equal(((await approval.json()) as { status: string }).status, "approved");

  const replacement = new FormData();
  replacement.append(
    "file",
    new Blob(["replacement-content"], { type: "application/pdf" }),
    "birth-replacement.pdf",
  );
  const replaced = await request(`/api/students/${student.id}/documents/${documentIds[0]}`, {
    method: "PUT",
    headers: { cookie: sessionCookie },
    body: replacement,
  });
  assert.equal(replaced.status, 200, "document replacement should persist");
  assert.equal(((await replaced.json()) as { status: string }).status, "pending");

  const blockedDownload = await request(
    `/api/students/${student.id}/documents/${documentIds[0]}/download`,
    { headers: { cookie: sessionCookie } },
  );
  assert.equal(
    blockedDownload.status,
    409,
    "pending replacement should remain unavailable until verified",
  );

  const replacementVerification = await request(
    `/api/students/${student.id}/documents/${documentIds[0]}/verify`,
    { method: "POST", headers: { cookie: sessionCookie } },
  );
  assert.equal(replacementVerification.status, 201, "replacement verification should persist");

  const downloaded = await request(
    `/api/students/${student.id}/documents/${documentIds[0]}/download`,
    { headers: { cookie: sessionCookie } },
  );
  assert.equal(downloaded.status, 200, "authorized document download should succeed");
  assert.equal(await downloaded.text(), "replacement-content");

  const deleted = await request(`/api/students/${student.id}/documents/${documentIds[0]}`, {
    method: "DELETE",
    headers: { cookie: sessionCookie },
  });
  assert.equal(deleted.status, 200, "document deletion should persist");

  const transfer = await request(`/api/students/${student.id}/transfer`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({
      classId: "JSS 2",
      armId: "B",
      effectiveDate: "2026-10-01",
      reason: "Live workflow transfer",
    }),
  });
  assert.equal(transfer.status, 201, "student transfer should persist");
  assert.equal(((await transfer.json()) as { status: string }).status, "transferred");

  const withdrawal = await request(`/api/students/${student.id}/withdraw`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: sessionCookie },
    body: JSON.stringify({ effectiveDate: "2026-11-01", reason: "Live workflow withdrawal" }),
  });
  assert.equal(withdrawal.status, 201, "student withdrawal should persist");
  assert.equal(((await withdrawal.json()) as { status: string }).status, "withdrawn");

  console.log("live student, document, lifecycle, and tenant-isolation workflow test passed");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
