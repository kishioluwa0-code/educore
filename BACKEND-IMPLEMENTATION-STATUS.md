# EduCore Backend Implementation Status

**Status:** Canonical backend delivery guide
**Last reviewed:** 2026-09-09
**Repository:** `https://github.com/imageandkolors/educore`
**Branch:** `main`

This is the only authoritative status tracker for backend implementation work. The other EduCore Markdown files contain product requirements, design detail, audits, and migration notes, but their checkboxes must not be used to select the next backend slice.

## Status rules

- `[x]` Verified complete: implemented, persisted on the server, authorized, focused validation passed, documentation updated, committed, and pushed.
- `[~]` Partial: some implementation exists, but a required server boundary, test, migration, workflow, or production concern remains.
- `[ ]` Planned: not implemented as a backend slice.

Every slice update must include:

1. Server data model and persistence boundary.
2. Server authorization and tenant/scope rules.
3. Lifecycle and audit behavior where applicable.
4. Focused automated or live validation.
5. Migration and rollback notes.
6. Documentation update in this file and the relevant detailed document.
7. A commit pushed to `origin/main`.

Never mark a slice complete because a screen or local store exists. Browser-only behavior is evidence of a prototype, not a completed backend slice.

## Current verified state

The current backend has verified foundations for authentication, tenancy, audit events, school onboarding/approval, student lifecycle, private development documents, academic teacher scope, assignments, scoped student registers, and an attendance lifecycle foundation.

The local PostgreSQL environment currently contains the approved `Impact Breed School, Maya Lagos.` tenant and its administrator. Platform superadmin sessions remain separate from school administrator sessions.

## Phase 0 - Engineering baseline and release safety

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 0.1 Typecheck, lint, formatting baseline | `[~]` | API typecheck and frontend build pass. Lint/format and CI policy are not a complete release gate. |
| 0.2 Test harness | `[~]` | `identity-tenancy.test.ts` and `student-workflow.test.ts` exist. Dedicated slice tests, browser tests, and a consistent test runner remain. |
| 0.3 Environment and secrets contract | `[x]` | `apps/api/src/common/env.ts`, `.env.example`, validated `DATABASE_URL` and `SESSION_SECRET`. |
| 0.4 Dependency and supply-chain hygiene | `[~]` | Removed the vulnerable browser `xlsx` dependency, added a `js-yaml` security override, and verified zero production-dependency vulnerabilities with `npm audit --omit=dev`; remaining development-tool advisories still require maintenance upgrades. |
| 0.5 Deployment safety | `[~]` | Health routes and migrations exist; rollback, backups, observability, and production release rehearsal remain. |

## Phase 1 - Identity, tenancy, and authorization

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 1.1 API application boundary | `[x]` | NestJS/Fastify entrypoint, health routes, request context, database module, migrations. |
| 1.2 Identity and sessions | `[x]` | Sign-in/sign-out, scrypt passwords, HTTP-only sessions, expiry, revocation, lockout, `/api/auth/me`, audit events. |
| 1.3 Schools and active tenancy | `[~]` | School registration, setup persistence, active school context, and platform approval exist. Membership administration and full school-context UI remain. |
| 1.4 Memberships, roles, capabilities | `[~]` | Schema, role catalog, capability checks, and seed grants exist. Complete membership administration and real-database authorization matrix remain. |
| 1.5 Relationship and assignment scope | `[~]` | Teacher assignment scope exists. Parent-child relationships and complete session/term relationship policy remain. |
| 1.6 Audit foundation | `[x]` | Append-only audit events, before/after redaction, allowed/denied auth records, and mutation audit calls exist. |

## Phase 2 - Students, admissions, and documents

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 2.1 Student, guardian, enrolment schema | `[x]` | PostgreSQL student/guardian schema and tenant constraints in migration `0004_numerous_falcon`. Guardian workflow breadth remains limited. |
| 2.2 Student lifecycle API | `[x]` | Create, read, update, approve, transfer, withdraw, duplicate admission protection, authorization, audit. |
| 2.3 Private documents | `[~]` | Upload, checksum, metadata, administrator verification/rejection, replacement, private download, and deletion are server-backed. No third-party or local malware scanner is used; every uploaded/replaced document remains unavailable until an authorized administrator verifies it. Production still requires the selected private-storage provider, migration/reconciliation of existing binaries, malware-policy review, and browser authorization coverage. |
| 2.4 Admission workflow integration | `[~]` | Server-backed admission and required-document gate exist. Full browser automation, draft reconciliation, and all guardian handoffs remain. |
| 2.5 Local migration/reconciliation | `[~]` | Student metadata preview/executor exists. Guardian records, browser document binaries, local audit history, and server-authoritative cutover remain. |
| 2.6 Authorization and browser tests | `[~]` | Live student/document/lifecycle/tenant workflow passes with a seeded fixture. Dedicated student-scope, document-permission, and browser admission tests remain. |

## Phase 3 - Academic structure, teacher scope, and attendance

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 3.1 Academic sessions, terms, classes, arms, subjects | `[x]` | School-scoped administrator/principal CRUD endpoints, parent validation, safe-delete dependency checks, capability grants, audit events, and migration `0014_academic_structure_capabilities` are implemented. |
| 3.2 Teacher assignments and history | `[x]` | Migrations `0008_academic_assignment_history` and `0009_academic_assignment_capabilities`; create/list/soft-close APIs, effective dates, overlap checks, capabilities, audit. |
| 3.3 Teacher scope and scoped student registers | `[x]` | `/api/academics/me/scope`; SQL-enforced teacher list/detail scope in student repository; document lookup reuses scoped student detail. |
| 3.4 Attendance submission/review/approval | `[x]` | Migrations `0010` through `0013`; UUID-backed academic references, session/term-aware scope, teacher-scoped reads, draft/submitted/returned/approved API, exception/follow-up records, audit events, and `api:attendance:test` all pass. |
| 3.5 Offline/idempotent attendance sync | `[x]` | Attendance create supports tenant-scoped `Idempotency-Key` retries and conflicting-payload `409` ha3ndling via migration `0015_attendance_idempotency`. Durable sync operations in migration `0022_cool_sir_ram` provide bounded `POST /api/attendance/sync` replay, tenant-scoped operation fingerprints, applied/conflict reconciliation states, and `GET /api/attendance/sync` status retrieval. Focused live validation is included in `attendance-workflow.test.ts`. |
| 3.6 Teacher dashboard task queue | `[x]` | `GET /api/teacher/dashboard/tasks` returns pending attendance records scoped to the authenticated teacher's current class assignments. Task objects include type, title, date, status, action, and metadata. Focused test file created. Additional task types remain planned. |

## Phase 4 - Assessment, moderation, and results

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 4.1 Gradebook and score policy | `[x]` | Server-authoritative gradebook with component policy (JSONB array with name/weight), score storage per student, validation (scores 0-100, policy weights sum to 100), and authorization scopes. Endpoints: POST /api/gradebooks/:classId/:armId/:sessionId (create), GET /api/gradebooks/:gradebookId (fetch with details), PATCH /api/gradebooks/:gradebookId/policy (update policy), GET /api/gradebooks/:gradebookId/rows (list grades), GET/POST /api/gradebooks/:gradebookId/rows/:studentId (get/set student scores). Database: gradebooks table (schoolId, classId, armId, sessionId, termId, subjectId, componentPolicy), gradeRows table (gradebookId, studentId, scores). Capability enforcement: gradebookRead/Write/Approve. Audit trail recorded for all mutations. Test file created. |
| 4.2 Moderation and publication lifecycle | `[x]` | Gradebook submission workflow with status lifecycle (draft → submitted → modificationRequested/approved → published). Teacher submits gradebook, principal/admin reviews and approves or requests corrections. Immutable grade snapshots created on publication. Endpoints: POST /api/gradebooks/:gradebookId/submit (teacher submits), GET /api/gradebooks/:gradebookId/submission (get status), PATCH /api/gradebooks/:gradebookId/submission/review (approve/request modifications with feedback), POST /api/gradebooks/:gradebookId/publish (create snapshot and lock), GET /api/gradebooks/:gradebookId/published (fetch snapshot). Database: gradebook_submissions table (status, submission/review/publication timestamps and actors, feedback JSONB), gradeSnapshots table (immutable copies of grades at publication). Capability enforcement: gradebookWrite for submission, gradebookApprove for review/publication. Audit trail records all status transitions. Test file created. |
| 4.3 Student/parent published results | `[x]` | Student and parent viewing of immutable published grade snapshots. Endpoints: GET /api/results/me (student own results), GET /api/results/student/:studentId (parent or authorized admin views student results), GET /api/results/:snapshotId/verify (verification endpoint returns publication proof). Authorization: linked student accounts use `students.user_id`, linked guardians use `student_guardians.guardian_user_id`, and administrators require `gradebookRead`. Cross-school membership and relationship scoping are enforced; verification returns snapshot + submission metadata and all access is audited. Viewer-link columns and indexes are in migration `0018_third_the_phantom`; snapshots are immutable after publication. |
| 4.4 Promotion, retention, graduation | `[x]` | Authoritative student movement lifecycle with promotion, retention, and graduation decisions. Endpoints: GET `/api/student-movements` and POST `/api/student-movements/:studentId`. Decisions are school/session scoped, unique per student/session, capability-protected by `student.move`, audited, and promotion requires a target class and arm. Migrations `0019_workable_madelyne_pryor` and `0020_sweet_silhouette` add graduation status and immutable movement records. Focused persistence test: `movement.test.ts`. |
| 4.5 Import/export safety | `[x]` | Server-controlled CSV student import/export boundary. Excel/XLSX parsing is intentionally not accepted; imports are limited to 1 MB and 2,000 rows, require an exact allowlisted header, reject formula-like cells, validate required fields and dates before transactional insert, enforce school capabilities, and audit import/export counts. Endpoints: `GET /api/students/export.csv` and `POST /api/students/import.csv`. Focused test: `student-transfer.test.ts`. |
| 4.6 Assessment authorization and concurrency | `[x]` | Assessment role matrix is explicit: teachers may read/write assigned gradebooks but not approve; principals/examinations may approve; parents/students remain read-only through published-result scope. Gradebook creation and score writes require `gradebookWrite`, student/gradebook school scope is checked, published policies are immutable, and score writes support optimistic concurrency through `If-Match` row versions with explicit conflicts. Publication snapshots are transactionally created and the approved-to-published transition is conditional. Focused authorization/concurrency test: `assessment-authorization-concurrency.test.ts`. |

## Phase 5 - CBT and examinations

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 5.1 Question bank and review | `[x]` | School-scoped question bank with tagged questions, immutable numbered versions, draft/reviewed/retired lifecycle, author/reviewer attribution, retirement guards, capability enforcement, and audit events. Migration `0023_luxuriant_clint_barton` adds `question_bank_items` and `question_bank_versions`. Endpoints: `GET/POST /api/question-bank`, `POST /api/question-bank/:id/versions`, `PATCH /api/question-bank/:id/versions/:versionId/review`, and `PATCH /api/question-bank/:id/retire`. Focused persistence test: `question-bank.test.ts`. |
| 5.2 School CBT and Practice CBT pools | `[x]` | Separate school-scoped `school` and `practice` pools with server-owned result policies, reviewed-question-version membership, draft/published/archived lifecycle, capability enforcement, tenant isolation, and audit events. Migration `0024_medical_psylocke` adds `cbt_pools` and `cbt_pool_questions`. Endpoints: `GET/POST /api/cbt-pools`, `POST /api/cbt-pools/:id/questions`, `PATCH /api/cbt-pools/:id/publish`, and `PATCH /api/cbt-pools/:id/archive`. Focused persistence test: `cbt-pools.test.ts`. |
| 5.3 Exam configuration and candidate snapshots | `[x]` | Exam configurations require a published CBT pool and school academic session, enforce opening/closing times, accept bounded candidate lists, and freeze admission/class identity snapshots before publication. Migration `0025_chunky_jetstream` adds `exam_configurations` and `exam_candidates`; candidate/student foreign keys prevent deletion while an exam references a candidate. Endpoints: `GET/POST /api/exams` and `POST /api/exams/:id/candidate-snapshot`. Focused persistence test: `exam-snapshot.test.ts`. |
| 5.4 Attempts, expiry, autosave | `[x]` | Server-authoritative student attempts use frozen exam question/option ordering, exam-window expiry, one attempt per configuration/student, active/submitted/expired lifecycle, tenant and linked-student authorization, retry-safe operation IDs, monotonic autosave sequences, and audit events. Migration `0026_empty_harry_osborn` adds `cbt_attempts` and `cbt_autosaves`. Endpoints: `POST /api/exams/:id/attempts`, `GET /api/cbt-attempts/:id`, `PATCH /api/cbt-attempts/:id/autosave`, and `POST /api/cbt-attempts/:id/submit`. Focused persistence test: `cbt-attempt.test.ts`. |
| 5.5 Proctoring and reconnect recovery | `[x]` | Migration `0027_chemical_marvel_boy` adds append-only, operation-idempotent CBT attempt events with server-maintained sequences, bounded metadata, timestamp validation, and reconnect replay by sequence. Student event writes are linked-student and capability scoped; examination, principal, teacher, and administrator roles can review tenant-scoped events. Endpoints: `POST/GET /api/cbt-attempts/:id/events`. Focused persistence tests: `cbt-events.test.ts` and the CBT attempt regression test. |
| 5.6 Marking, publication, load/operations | `[~]` | Migrations `0028_loving_the_renegades` through `0032_serious_banshee` add server-owned CBT results, disjoint per-candidate question allocation, incident invalidation/reset, idempotent CBT-to-gradebook synchronization receipts, per-component grade source metadata, and a one-time published-grade correction allowance. Migration `0033_cbt_result_jobs` adds a durable, idempotent PostgreSQL job queue with row-lock/skip-locked claims, leases, stale-lease recovery, bounded exponential retries, and marking/publication/reconciliation job types. Objective questions are marked immediately. Authorized examiners can manually mark each pending short-answer item through `PATCH /api/cbt-results/:id/questions/:questionVersionId`; row locking, score bounds, idempotent replay, audit logging, and published-result immutability are enforced. With `EDUCORE_CBT_WORKER_ENABLED=true`, marking and publication requests enqueue durable work and the worker processes it with explicit retry/failure ownership; the default remains synchronous for compatibility. `/api/health/ready` reports pending/running/failed CBT job counts, and request completion logs include request ID, route, status, and duration. Migration `0033_cbt_result_jobs`, regression/load test, and operational wiring were committed as `d6ff76e` and pushed to `origin/main`. Local live PostgreSQL execution was blocked by the pre-existing local server password configuration; typecheck and production build passed. Manual CA, assignment, and exam scores remain supported and are marked `manual`; CBT components remain never manually editable. Remaining production validation is full multi-instance load testing, alert delivery/reconciliation runbooks, and deployment capacity rehearsal. |

## Phase 6 - Finance and billing

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 6.1 Fee schedules | `[ ]` | Browser finance stores only; no backend schema/API. |
| 6.2 Invoices and approvals | `[ ]` | No transactional invoice API. |
| 6.3 Payments, allocations, refunds | `[ ]` | No idempotent payment/ledger boundary. |
| 6.4 Receipts and audit lifecycle | `[ ]` | No server receipt entity or secure document workflow. |
| 6.5 Reconciliation and debt follow-up | `[ ]` | No backend reconciliation or reporting records. |
| 6.6 Segregation and restricted finance views | `[ ]` | No server finance permission/test boundary. |

## Phase 7 - HR, communication, and workforce operations

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 7.1 Staff directory and employment lifecycle | `[~]` | Frontend staff onboarding exists; no complete server staff directory/lifecycle API. |
| 7.2 Staff documents and verification | `[ ]` | No server staff document lifecycle. |
| 7.3 Leave and return-to-work | `[ ]` | No backend leave records, balances, approvals, or handoffs. |
| 7.4 Staff attendance and export | `[ ]` | No backend staff attendance period/correction boundary. |
| 7.5 Payroll field permissions and audit | `[ ]` | No backend payroll/bank/tax boundary. |
| 7.6 Communication delivery | `[ ]` | No durable message delivery, retries, templates, or history API. |

## Phase 8 - Reporting, operations, and production hardening

| Slice | Status | Current evidence / remaining work |
|---|---|---|
| 8.1 Permission-aware reports | `[ ]` | Reports are browser/local data views. |
| 8.2 Export jobs and secure downloads | `[ ]` | No server export job or rate-limited download boundary. |
| 8.3 Logs, traces, metrics, alerts | `[~]` | Request IDs and Fastify logs exist; structured operational telemetry and security alerting remain. |
| 8.4 Privacy, backups, disaster recovery | `[ ]` | No retention/deletion tooling or backup restore rehearsal. |
| 8.5 Performance and load testing | `[ ]` | No full backend load/performance suite. |
| 8.6 Production rollout and onboarding runbook | `[~]` | Local migrations, health checks, and onboarding approval path exist; production rollout/rollback monitoring remains. |

## HR extension

| Slice | Status |
|---|---|
| HR.1 Staff directory/profile/search | `[~]` frontend-only onboarding records |
| HR.2 Verification/document lifecycle | `[ ]` |
| HR.3 Employment/leave/return-to-work | `[ ]` |
| HR.4 Staff attendance/corrections/export | `[ ]` |
| HR.5 HR/payroll permissions and audit | `[ ]` |
| HR.6 Assignment readiness/reports/notifications | `[ ]` |

## Next slice selection

The next backend slice must be selected from the first `[~]` or `[ ]` item whose dependencies are satisfied. Current priority order:

1. Implement marking, publication, queue workers, load tests, and operational monitoring (Slice 5.6).

## Required update procedure

When a slice is completed, update this file first, then update only the detailed document that describes that domain. Add the migration, tests, commit hash, and push result in the same change. Older documents must not introduce new status checkboxes or override this tracker.

## Evidence index

- API modules: `apps/api/src/`
- Database schema: `apps/api/drizzle/schema.ts`
- Migrations: `apps/api/drizzle/migrations/`
- Tests: `apps/api/test/`
- Current verified tests: `npm run api:typecheck`, `npm run api:test`, and `npm run api:attendance:test`; the live student workflow requires a seeded local fixture and `EDUCORE_TEST_PASSWORD`.
- Current remote: `https://github.com/imageandkolors/educore`
