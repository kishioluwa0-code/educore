# EduCore Phased Implementation Plan

> **Status authority:** This document is retained for phase detail only. Do not use its status checkboxes to select work. The canonical backend status tracker is [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md).

**Status:** Active delivery plan  
**First slice:** Identity and tenancy foundation  
**Repository:** `myjobsflow-ui/educore1`

## Environment verification - 2026-09-08

The local platform approval workflow has been exercised successfully. `Impact Breed School, Maya Lagos.` is approved and active in the local PostgreSQL database, so its administrator can proceed from onboarding into normal school operations. The platform superadmin remains separate from school administrator sessions.

## Delivery rules

Each slice must deliver one usable vertical capability, include its data model and persistence boundary, define server-side authorization, include loading/error/restricted states where the UI is touched, add focused tests, pass build and lint gates, update this document, and be committed and pushed to `origin/main`.

No slice is considered complete because a screen exists. A slice is complete only when the server is authoritative, the relevant workflow can be exercised by two sessions, unauthorized access is rejected, audit behavior is verified, and the migration or rollback impact is documented.

## Phase 0 — Engineering baseline and release safety

**Objective:** Make the repository safe to change repeatedly before introducing production data.

| Slice | Scope                               | Exit criteria                                                                                         |
| ----- | ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0.1   | Type-checking and lint baseline     | `tsc`, lint, and formatting run in CI; existing violations are triaged and the touched area is clean  |
| 0.2   | Test harness                        | Unit, API, authorization, and browser smoke-test commands exist                                       |
| 0.3   | Environment and secrets contract    | Validated environment schema, local example file, staging/production separation, no committed secrets |
| 0.4   | Dependency and supply-chain hygiene | Vulnerable `xlsx` path is removed, replaced, or isolated; lockfile audit runs in CI                   |
| 0.5   | Deployment safety                   | Health endpoints, migration policy, rollback notes, backup/restore rehearsal, and release checklist   |

## Phase 1 — Identity and tenancy foundation

**Objective:** Replace browser-selected roles with authenticated users who belong to one or more schools and receive server-enforced capabilities.

### Slice 1.1 — Backend application boundary

Create the backend application boundary and shared request context. The API must expose health checks, structured errors, request IDs, environment validation, and a consistent authenticated-request shape.

### Slice 1.2 — Identity and sessions

Implement real sign-in, sign-out, session expiry, session revocation, password or OIDC-provider integration, secure HTTP-only cookies, and current-user retrieval. The frontend role selector must stop granting access locally.

### Slice 1.3 — Schools and tenancy

Create schools, school settings, academic sessions, terms, and active school context. Every tenant-owned record must have a server-derived `schoolId`; client-provided school IDs are never trusted.

### Slice 1.4 — Memberships, roles, and capabilities

Create users, school memberships, roles, capabilities, role-capability assignments, and policy checks. Implement capability checks for reading and mutating records, not only menu-level role filtering.

### Slice 1.5 — Relationship and assignment scope

Create parent-child links, teacher assignments, class/subject scope, and a policy context that can answer whether a user may access a specific student, class, subject, session, or term.

### Slice 1.6 — Audit foundation

Create an append-only audit event model containing actor, school, action, object type, object ID, reason, before/after summary, request ID, timestamp, and outcome. Denied access attempts must be recorded without leaking sensitive data.

**Phase 1 exit criteria:** A user can authenticate, belong to a school, receive capabilities, select an authorized school context, access only permitted records, and produce immutable audit events. Two school sessions cannot cross-read one another.

## Phase 2 — Students, admissions, and documents

**Objective:** Make the student master record durable and safe for all later modules.

| Slice | Scope                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------- |
| 2.1   | Student, guardian, enrolment, lifecycle-event, and admission-status schema                              |
| 2.2   | Server-side create/read/update/approve/transfer/withdraw APIs with uniqueness constraints               |
| 2.3   | Private document storage, metadata, checksum, verification, rejection, replacement, and secure download |
| 2.4   | Multi-step admission form integration with draft recovery and server validation                         |
| 2.5   | LocalStorage export, matching, conflict report, import, reconciliation, and read-through fallback       |
| 2.6   | Student/profile/guardian authorization and audit browser tests                                          |

## Phase 3 — Academic structure, teacher scope, and attendance

**Objective:** Establish authoritative school operations and teacher scope.

Current implementation note: the academic scope foundation and assignment administration are now present. Migrations `0007_academic_scope`, `0008_academic_assignment_history`, and `0009_academic_assignment_capabilities` add sessions, terms, classes, arms, subjects, effective-dated teacher assignments, protected assignment listing/create/close endpoints, overlap validation, role grants, and audit events. `GET /api/academics/me/scope` resolves only current assignments for the authenticated teacher and tenant. Scoped student registers remain open.

Scoped student register update: `GET /api/students` and `GET /api/students/:studentId` now apply SQL-enforced active teacher class/subject assignment scope. Administrators and principals retain school-wide access; out-of-scope teacher details resolve as not found. Student document lookups reuse the scoped student detail path. Parent/student relationship scope remains a separate follow-up.

Attendance update: migrations `0010_attendance_records` and `0011_attendance_capabilities` add tenant-owned attendance records with student entries and draft/submitted/returned/approved lifecycle states. The protected attendance API validates class membership, teacher assignment scope, lifecycle transitions, review reasons, and audit events. Migration `0022_cool_sir_ram` adds durable tenant-scoped sync operations with payload fingerprints, bounded batch replay through `POST /api/attendance/sync`, applied/conflict reconciliation states, status retrieval, and audit coverage. Local browser outbox storage remains a client concern; the server is authoritative for replay and conflict status.

| Slice | Scope                                                                              |
| ----- | ---------------------------------------------------------------------------------- |
| 3.1   | Classes, arms, subjects, curriculum, timetable, enrolment, sessions, and terms     |
| 3.2   | Class-teacher and subject-teacher assignments with effective dates and history     |
| 3.3   | Server-resolved teacher scope and scoped student registers                         |
| 3.4   | Attendance submission, review, return, approval, exceptions, and absence follow-up |
| 3.5   | Offline outbox, idempotent sync, conflict handling, and reconciliation status      |
| 3.6   | Teacher dashboard task queue and role-specific navigation                          |

## Phase 4 — Assessment, moderation, and results

**Objective:** Make assessment records authoritative, reviewable, and publication-safe.

| Slice | Scope                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- |
| 4.1   | Gradebook, grade rows, component policy, score validation, and scoped editing            |
| 4.2   | Submission, moderation, correction request, approval, and immutable publication snapshot |
| 4.3   | Student/parent published-result views and result verification endpoint                   |
| 4.4   | Promotion, retention, graduation, and reviewer approval                                  |
| 4.5   | Excel import/export isolation, validation, and malware/resource controls                 |
| 4.6   | Assessment authorization matrix, concurrency tests, and audit verification               |

Slice 4.5 is implemented as a server-controlled CSV boundary for student records. XLSX parsing is intentionally excluded to avoid unsafe workbook processing; imports use exact allowlisted columns, formula-cell rejection, bounded payload/row counts, validation-before-transaction, capability checks, and audit events. Student export is emitted as an attachment with CSV content type and school-scoped records.

Slice 4.6 is implemented with explicit assessment role capabilities, school/student scope checks, published-gradebook immutability, optimistic score-row concurrency via an integer `If-Match` row version, and transactional conditional publication. The focused authorization/concurrency test verifies the role matrix and that only one concurrent update using the same row version succeeds.

Question bank update: migration `0023_luxuriant_clint_barton` adds school-scoped question items and immutable numbered versions. The protected API supports tagged authoring, new draft versions, reviewer-only approval, reviewed-question retirement, author/reviewer attribution, and audit events. Retired questions cannot receive new versions, and only reviewed questions can be retired. CBT pools and candidate snapshots remain later Phase 5 slices.

CBT pool update: migration `0024_medical_psylocke` adds separate school and practice pools with explicit result policies, reviewed question-version membership, ordered questions, and draft/published/archived lifecycle. Pool editing is restricted to drafts, publication requires at least one reviewed question, and all pool mutations are tenant-scoped and audited. Candidate snapshots and attempts remain in Slices 5.3–5.4.

Exam configuration update: migration `0025_chunky_jetstream` adds school/session-bound exam configurations and immutable candidate snapshot rows. Only published pools can be configured, candidate IDs are validated within the school, open/close windows are enforced, and publication atomically freezes the candidate identity fields used by later attempts. Candidate references use restrictive deletion semantics to prevent historical exam snapshots from orphaning.

CBT attempt update: migration `0026_empty_harry_osborn` adds authoritative attempts and retry-safe autosaves. Student attempts freeze question ordering, enforce exam-window expiry, and expose only linked-student data.

Proctoring and recovery update: migration `0027_chemical_marvel_boy` adds append-only, operation-idempotent attempt events and a server-maintained event sequence. Connected, disconnected, reconnected, fullscreen, tab visibility, blur, and focus events are bounded and tenant-scoped. Students can replay events after a known sequence, while examination, principal, teacher, and administrator roles can review school-scoped event history. Event writes and reads are capability protected and audited.

CBT result update: migration `0028_loving_the_renegades` adds immutable-per-attempt result records. Objective answers are marked against the frozen question versions, short-answer items remain pending manual review, repeated marking returns the existing result, and publication is blocked until manual marking is complete or the configured release window permits publication. Result reads expose only published, tenant-scoped records and linked students receive only their own result. Marking and publication are audited. Migration `0033_cbt_result_jobs` adds idempotent marking/publication/reconciliation jobs with lease recovery and bounded retries; when `EDUCORE_CBT_WORKER_ENABLED=true`, mark and publish requests enqueue work for the worker while the worker records explicit failures for retry or operational inspection. The readiness endpoint reports queue counts and request completion logs include request IDs and durations. The implementation, regression/load test, and operational wiring were committed as `d6ff76e` and pushed to `origin/main`; local live PostgreSQL execution remains blocked by the pre-existing local server password configuration. Full multi-instance load, alert delivery/reconciliation runbooks, and deployment capacity rehearsal remain required before Slice 5.6 is complete for deployment.

Unique delivery and synchronization update: migrations `0029_black_screwball` and `0030_petite_hardball` require a configured question count, reserve disjoint reviewed question versions per candidate under a locked exam configuration, and reject exam publication when the pool cannot satisfy the full candidate allocation. Detected disconnect, blur, hidden-tab, or fullscreen-exit events expire the attempt; an authorized examination/principal/admin reset can resume it only before the server expiry. Screen capture or photography using another device cannot be technically prevented by a web backend and remains a physical/proctoring limitation. When an exam is configured with a gradebook and component key, result publication transactionally upserts that student's exact component and records an idempotent `assessment_score_sources` receipt. CA and assignment sources must use the same source-receipt contract before being called synchronized.

Grade source protection update: migration `0031_magical_richard_fisk` adds `grade_rows.score_sources`. Manual CA, assignment, and exam writes are tagged as editable manual components. CBT publication tags its mapped component with the CBT result ID and `editable: false`; later manual grade writes for that component are rejected. Grade row reads expose the source metadata so the UI can indicate whether each score is manual or CBT-derived. Published gradebook snapshots remain immutable.

Publication lock update: manual grade-row upserts now verify the gradebook submission state inside a transaction, and CBT synchronization checks the same state while holding the gradebook row lock. After approval/publication, no manual or automatic score source can mutate the gradebook; corrections require a separate authorized revision workflow rather than an in-place write.

Administrator correction update: migration `0032_serious_banshee` adds one correction-use flag and actor/timestamp fields to gradebook submissions. A school administrator may make exactly one post-publication correction to an existing manual component; the published snapshot is updated in the same transaction, the correction is audited by the normal grade-score audit path, and the correction flag permanently closes the gradebook afterward. Teachers and other roles cannot use this path, and CBT-derived components remain permanently read-only.

Attempt update: migration `0026_empty_harry_osborn` adds one-attempt-per-candidate records and retry-safe autosave operations. Attempt start materializes deterministic question/option payloads from the published pool, uses the exam close time as the authoritative expiry, requires the authenticated user to be the linked student, and rejects writes after expiry/submission. Autosave operation IDs and monotonic sequences prevent duplicate or stale client writes; all start, autosave, and submit mutations are audited.

## Phase 5 — CBT and examinations

**Objective:** Deliver an examination engine with authoritative timing, recovery, and review evidence.

| Slice | Scope                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------- |
| 5.1   | Question bank, tags, versions, author/reviewer workflow, and retirement                              |
| 5.2   | Separate School CBT and Practice CBT pools and result policies                                       |
| 5.3   | Exam configuration and frozen candidate snapshots                                                    |
| 5.4   | Attempt creation, authoritative expiry, deterministic question/option order, and retry-safe autosave |
| 5.5   | Reconnect recovery, fullscreen/tab/blur incident records, and review policy                          |
| 5.6   | Marking, exception review, publication, queue workers, load tests, and operational monitoring        |

## Phase 6 — Finance and billing

**Objective:** Make financial operations transactional, idempotent, and segregated by capability.

| Slice | Scope                                                                                   |
| ----- | --------------------------------------------------------------------------------------- |
| 6.1   | Fee schedules, versions, fee lines, class/session/term scope, publish/archive lifecycle |
| 6.2   | Invoices, line items, approvals, duplicate prevention, and period locks                 |
| 6.3   | Payments, allocations, overpayments, reversals, refunds, and idempotency keys           |
| 6.4   | Receipts, reprints, voids, secure documents, and audit lifecycle                        |
| 6.5   | Reconciliation, discounts, scholarships, waivers, debt follow-up, and reports           |
| 6.6   | Segregation-of-duties tests and parent/student restricted financial views               |

## Phase 7 — HR, communication, and workforce operations

**Objective:** Connect staff lifecycle, communication, and sensitive workforce data without overexposure.

| Slice | Scope                                                                             |
| ----- | --------------------------------------------------------------------------------- |
| 7.1   | Staff directory, profile detail, employment lifecycle, and effective-dated status |
| 7.2   | Certificate/document verification, expiry, replacement, and secure access         |
| 7.3   | Leave requests, balances, approval, handover, and return-to-work                  |
| 7.4   | Staff attendance periods, corrections, exceptions, and payroll-ready export       |
| 7.5   | Field-level payroll/bank/tax permissions and audit                                |
| 7.6   | Notifications, templates, delivery status, retries, and communication history     |

## Phase 8 — Reporting, operations, and production hardening

**Objective:** Turn operational records into reliable decision support and operate the system safely.

| Slice | Scope                                                                              |
| ----- | ---------------------------------------------------------------------------------- |
| 8.1   | Permission-aware report read models and session/term filters                       |
| 8.2   | Export jobs, rate limits, large-report controls, and secure download               |
| 8.3   | Structured logs, traces, metrics, security alerts, and incident response           |
| 8.4   | Privacy retention/deletion tools, backup restoration drills, and disaster recovery |
| 8.5   | Performance testing, 1,000-candidate CBT test, and database/index tuning           |
| 8.6   | Production rollout, migration monitoring, rollback, and school onboarding runbook  |

## Current slice

**Phase 1 foundation rollout remains open, while Phase 2 student delivery is active.** Slices 1.1 and 1.2 are implemented in the application boundary, but real PostgreSQL integration and school onboarding remain before Phase 1 can exit.

- [x] Slice 1.1 — Backend application boundary: NestJS/Fastify entrypoint, environment validation, health endpoints, request IDs, database service, Drizzle migration, and API package structure.
- [x] Identity primitives: opaque session-token generation, SHA-256 token hashing, expiry, constant-time comparison, current-user guard seam, and `/api/auth/me` contract.
- [x] Tenancy primitives: school membership context, active-school resolution, cross-school denial, capability policy service, system role catalog, and capability seed contract.
- [x] Audit contract: append-only audit-event schema and sensitive snapshot redaction helper.
- [x] Frontend integration: server-backed `src/lib/identity-api.ts`, cookie-aware role context, Vite `/api` proxy, and sign-in form with loading/error states.
- [x] Slice 1.2 — Database-backed credential sign-in, opaque HTTP-only session creation, expiry, revocation, account lockout, current-user retrieval, and authentication audit events.
- [x] Verification: backend type-check, password/session/policy tests, migration generation, frontend production build, API liveness smoke test, and unauthenticated `401` protection test.
- [x] Real PostgreSQL integration: migrations applied, administrator seeded with an explicit local password, API health verified, and sign-in/current-user session exercised.
- [ ] Slice 1.3 — School onboarding, membership administration, and server-derived active school context in the UI.
- [ ] Slice 1.4 — Authorization integration tests against a real PostgreSQL test database and database defense-in-depth policies.

### Phase 1 onboarding implementation update

Administrator onboarding is now partially full-stack:

- [x] Authenticated school setup read/write API scoped to the active school
- [x] Server persistence for school profile fields, setup step, and go-live checklist
- [x] `school.manage` authorization and setup audit events
- [x] Setup wizard server hydration with local fallback for offline/resume behavior
- [x] Pre-dashboard routing: new authenticated school administrators are sent to `/setup` until setup reaches the ready step
- [x] Platform superadmin role, school listing, approval API, and superadmin dashboard
- [~] Academic sessions/terms, class structure, grading, assessment weights, governance rules, and named approval owners remain browser-local
- [x] Clean-data boundary: fresh clients no longer receive seeded student fallback records; authenticated registry data comes from the server
- [ ] Complete server-backed onboarding transaction and browser workflow coverage

### Phase 2 implementation update

The student/document work has now moved from planning into incremental delivery. The following Phase 2 slices are implemented in the current workspace:

- [x] 2.1/2.2 — Student and guardian schema plus authenticated create/read/update/approve/transfer/withdraw APIs
- [x] 2.3 — Private development storage, document metadata, checksums, verification/rejection, replacement, authorized download, and deletion
- [x] 2.4 — Multi-step admission integration with draft recovery, server creation, required document upload, and failure recovery
- [~] 2.5 — Local student migration preview and non-conflicting executor with JSON report; guardian/document-binary reconciliation and server-authoritative cutover remain
- [~] 2.6 — Capability/audit checks, UI integration, live student/document/lifecycle checks, cross-school isolation, and browser sign-in smoke coverage are present; browser admission/upload automation remains

The document boundary supports private objects and five-minute signed downloads, with administrator verification required before any download. No third-party or local malware scanner is configured; this is an explicit risk decision and requires documented manual-review controls, migration/reconciliation of existing binaries, guardian/browser handoff coverage, and removal of any browser-only writes before production approval.

Slice 5.6 now exposes an authorized manual short-answer marking boundary. Each pending item is updated under a locked CBT-result transaction with score bounds, replay-safe same-score behavior, audit logging, and permanent rejection after publication. Migration `0033_cbt_result_jobs` adds durable marking/publication/reconciliation jobs with idempotent work keys, skip-locked leases, stale-lease recovery, retries, and an opt-in worker. Readiness reports queue counts and request completion logs carry request IDs and durations. The 100-concurrent-job claim validation passes; full multi-instance capacity, alert delivery, and deployment rehearsal remain required.

The completed code now establishes the credential/session path and removes client-selected roles from the sign-in UI. Production deployment still requires a PostgreSQL instance, migration application, explicit seed credentials, and an integration test that exercises two real school sessions. OIDC/provider login remains an optional hardening path after the credential flow is operational.

## Source documents

The product scope remains in [`EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md`](./EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md). The teacher, CBT, HR, and dashboard workflow details remain in [`EDUCORE-PRIMARY-CLASS-TEACHER-ACCESS-IMPLEMENTATION.md`](./EDUCORE-PRIMARY-CLASS-TEACHER-ACCESS-IMPLEMENTATION.md). The student/document migration contract remains in [`EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md`](./EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md). The audit and backend recommendation is in [`EDUCORE-COMPLETE-AUDIT-AND-BACKEND-RECOMMENDATION.md`](./EDUCORE-COMPLETE-AUDIT-AND-BACKEND-RECOMMENDATION.md).
