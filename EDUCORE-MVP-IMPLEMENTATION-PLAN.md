# EduCore MVP Implementation Plan

> This document is the working delivery plan for the next phase of the project. It combines the frontend route and UX work with the backend readiness plan so the team can execute one agreed MVP path.
>
> Source of truth for backend status: [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md)
>
> Source of truth for broader ERP scope: [EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md](./EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md)
>
> Source of truth for phase detail: [EDUCORE-IMPLEMENTATION-PHASES.md](./EDUCORE-IMPLEMENTATION-PHASES.md)

## 1. MVP goal

Build the first launchable school operating system for a single school, with a narrow but end-to-end set of workflows that are secure, auditable, and usable by administrators, principals, teachers, and guardians.

The MVP must be real and operational, not a demo:
- real authentication and school context
- real school-scoped data
- real server-backed records where the backend exists
- real permission checks
- real workflow states and audit events
- basic deployment safety

## 2. MVP release scope

### In-scope for MVP
- School setup and onboarding
- Authentication and active school context
- Student registration and admissions
- Student record lifecycle (approve / transfer / withdraw)
- Student documents and verification gate
- Academic structure (sessions, terms, classes, arms, subjects)
- Teacher assignments and scope
- Attendance capture, review, and approval
- Gradebook and score entry for classes
- Result publication and report card framing
- Basic dashboard with operational KPIs
- Platform approval / admin control for school registration

### Out-of-scope (defer until post-MVP)
- Full finance system with full accounting ledger
- HR/employment modules
- Advanced security operations
- Full communication suite and messaging workflows
- Deep inventory, transport, procurement, and facilities modules
- Large-scale analytics and custom reports beyond core school KPIs
- Custom ERP modules beyond the school operating system core

## 3. MVP module-by-module plan

### 3.1 Frontend MVP modules

#### A. Authentication and onboarding
Frontend target:
- sign-in page
- role-aware landing and routing
- school setup wizard
- platform superadmin approval flow

Backend target:
- `/api/auth/sign-in`
- `/api/auth/me`
- `/api/auth/sign-out`
- `/api/school/setup`
- `/api/school/platform/schools`

Status:
- Mostly live for sign-in and setup flows
- Still needs production hardening and final UI polish

#### B. Student management
Frontend target:
- student register listing
- student detail page
- new admission wizard
- pending admission queue
- approval / transfer / withdrawal actions
- document upload and verification statuses

Backend target:
- student CRUD and status lifecycle
- document upload, verification, rejection, replacement, download
- school tenancy enforcement

Status:
- Strongest live MVP area
- Needs full browser coverage and migration cleanup before final launch

#### C. Academic structure
Frontend target:
- sessions and terms
- classes and arms
- subjects
- teacher assignments
- academic scope for teacher dashboard

Backend target:
- school-scoped academic configuration
- assignment validation and overlap checks
- effective date history

Status:
- Backend is largely implemented
- UI should be aligned to server-authoritative data and final role checks

#### D. Teacher operations and attendance
Frontend target:
- teacher dashboard
- class attendance sheet
- submission and review flow
- absent and follow-up queue
- approval / return flow

Backend target:
- attendance lifecycle
- teacher scope filtering
- idempotent sync and durable replay

Status:
- Good backend foundation
- Needs final operational validation and a small set of live flows

#### E. Assessment and gradebook
Frontend target:
- score entry pages
- gradebook policy editor
- final result publication
- teacher roles and moderation flow

Backend target:
- policy validation
- score storage and authorization
- publication / moderation workflow

Status:
- Feature logic exists; needs UI-to-api completion and stable validation

#### F. Dashboard and operations overview
Frontend target:
- KPIs
- daily attendance summary
- needs-attention queue
- student approval queue
- live school health indicators

Backend target:
- aggregated reads from live database
- proper permissioned summaries

Status:
- Basic dashboard exists but needs finish by live data integration

### 3.2 Backend MVP modules

#### Core backend slices required for MVP
1. Identity and tenancy foundation
2. School setup and approval
3. Student lifecycle and documents
4. Academic structure and assignment scope
5. Teacher-scoped attendance
6. Gradebook and results
7. Audit trail
8. Health, migration, and release safety

#### Backend items we must not defer in MVP
- session and role enforcement
- active school context enforcement
- cross-school isolation
- immutable audit events
- school-scoped data access
- migration and rollback notes
- basic deployment health and release readiness

## 4. MVP delivery sequence

### Phase A — Foundation (Week 1)
Deliverables:
- sign-in and authenticated routing
- active school selection and school setup persistence
- platform approval / school registration flow
- role and permission context tied to server principal
- basic health checks and environment validation

Exit criteria:
- a user can sign in
- a school can be approved and selected
- a user only sees their authorized module set

### Phase B — Student core (Week 2)
Deliverables:
- student register
- create student
- approve / reject / transfer / withdraw
- document upload and verification gate
- student details and audit panel

Exit criteria:
- school admin can manage admission lifecycle end-to-end
- docs are uploaded, verified, and rejected correctly
- unauthorized cross-school reads are blocked

### Phase C — Academic operations (Week 3)
Deliverables:
- class / arm / subject setup
- teacher assignment creation and validation
- teacher scoped access endpoints and UI
- terms and sessions abstraction in live data

Exit criteria:
- teacher sees only their assigned classes and students
- admins can manage academic structure without inconsistent data

### Phase D — Attendance and tasks (Week 4)
Deliverables:
- attendance submission
- review / return / approval
- absent follow-up and follow-up queue
- teacher dashboard tasks
- sync and replay support if offline mode is required

Exit criteria:
- teacher can take attendance and review it
- principal/admin can approve or return it
- audit trail exists for every state change

### Phase E — Gradebook and results (Week 5)
Deliverables:
- gradebook policy creation and update
- score entry per student
- result calculation and publish flow
- report-ready outputs

Exit criteria:
- marking is consistent and authorized
- scores cannot exceed policy rules or tenant scope
- results can be published in controlled manner

### Phase F — Launch hardening (Week 6)
Deliverables:
- testing finalization
- production safety checklist
- migration and rollback notes
- auth + permissions regression pass
- error states and restricted states across critical flows
- pilot readiness sign-off

Exit criteria:
- no critical backend gap remains
- core system can be used in a real single-school pilot

## 5. Frontend-to-backend implementation rules

Every feature must follow this rule set:

1. Start from the backend contract
   - define the data model first
   - define authorization and school scope
   - define audit behavior

2. Build the UI around the API contract
   - loading state
   - error state
   - empty state
   - restricted state

3. Validate the happy path and denial path
   - authorized user can proceed
   - unauthorized user gets blocked
   - invalid state is rejected with clear error

4. Only consider a module "done" when server data is authoritative
   - not just local storage, not just a local React state flow

5. No feature may be marked complete without a test or focused validation

## 6. MVP quality gates

A module is only ready for launch if it meets all of the following:
- data is persisted on the server where required
- scope isolation is enforced by tenant and role
- user cannot access another school’s data
- audit event exists for mutations or access denials
- error states and restricted states are implemented in UI
- migration or rollback implications are documented
- targeted validation passes

## 7. Known gaps that must be closed before launch

These are the critical launch blockers from the current repo status:
- production deployment safety and release process are not fully complete
- dedicated test coverage is still incomplete for some slices
- some membership and broader role-administration flows remain partial
- document storage and production policy remain partially open
- finance and HR modules remain deferred beyond MVP
- front-end screens still include demo/local-store behavior in some modules

## 8. MVP recommendation: what we should ship first

Recommended launch order:
1. Auth + onboarding
2. Student lifecycle + documents
3. Academic structure + assignments
4. Attendance
5. Gradebook + results
6. Dashboard and pilot reporting

This order is the safest because it follows the real data dependency chain and minimizes blocked work.

## 9. Working execution checklist

Use this list as the immediate action queue:

- [ ] Confirm single-school MVP scope and pilot user roles
- [ ] Finalize the exact pages to be live vs. deferred
- [ ] Review all live API adapters with actual backend endpoints
- [ ] Close remaining auth + role enforcement gaps
- [ ] Complete student lifecycle live validation
- [ ] Complete academic assignment scope validation
- [ ] Finalize attendance live flow validation
- [ ] Finalize gradebook and results live flow validation
- [ ] Run production-safety and release checklist
- [ ] Create launch runbook and rollback notes

## 10. Final launch principle

The project is not a full ERP at this point. The correct approach is to ship a disciplined MVP based on real backend capabilities and clear launch boundaries, not to attempt the entire educational operating system in one go.

The team should treat this as a controlled, audit-friendly, single-school rollout with well-defined data ownership and role scope.

## 11. Day-by-day MVP sprint plan

This is a **30-working-day, six-week plan**, not a calendar-date commitment. It assumes one full-stack engineer with product/QA review available at each phase gate. Days are relative working days; weekends and school holidays are excluded. The schedule prioritizes integration and release readiness over adding more modules.

| Day | Focus | Deliverable / exit check |
|---|---|---|
| 1 | Lock MVP scope and roles | Confirm pilot school, administrator, principal, teacher, and examination roles; record deferred finance/HR/communications scope. |
| 2 | Trace existing API contracts | Map each in-scope screen to its controller/service and identify local-store writes still on the critical path. |
| 3 | Define pilot test data and journeys | Document two authorized sessions, a second-school isolation fixture, and the admin/teacher/student workflow scenarios. |
| 4 | Baseline and release gate | Run existing API typecheck, frontend build, lint, and focused tests; record baseline failures without expanding scope. |
| 5 | Foundation gate | Fix only MVP-blocking baseline issues; agree API error/loading/restricted UI conventions and migration/rollback procedure. |
| 6 | Authentication UI | Verify login, sign-out, session restoration, password-change handling, and authenticated/unauthenticated route behavior. |
| 7 | School setup integration | Make setup read/save failures visible; verify server-persisted setup and resume behavior. |
| 8 | Platform approval and tenant context | Verify registration, approval, active school context, and unauthorized school access behavior. |
| 9 | Role/access review | Compare UI role visibility with backend capability enforcement; close any MVP-critical mismatch. |
| 10 | Foundation acceptance | Run identity/tenancy tests and complete a pilot admin onboarding walkthrough. |
| 11 | Student register integration | Make the register server-authoritative for authenticated users; expose loading, empty, retry/error, and restricted states. |
| 12 | Admission integration | Verify server create, validation errors, draft recovery boundaries, and duplicate admission handling. |
| 13 | Documents | Verify upload, verification/rejection, replacement, authorized download, and required-document approval gate. |
| 14 | Lifecycle and migration | Verify approve/transfer/withdraw and review local-to-server reconciliation/conflict reporting. |
| 15 | Student acceptance | Run focused student/document/lifecycle and cross-school checks; fix critical regressions. |
| 16 | Academic data adapter | Connect academic setup pages to school-scoped API reads/writes; remove demo fallback from authenticated MVP paths. |
| 17 | Teacher assignments | Connect assignment management and teacher scope; verify effective dates and out-of-scope denial. |
| 18 | Academic UI states | Add loading/error/empty/restricted states to the in-scope structure and assignment pages. |
| 19 | Academic integration validation | Verify a teacher sees only assigned classes/students and an administrator can configure the academic structure. |
| 20 | Academic acceptance | Run typecheck/build and focused authorization/assignment checks; document remaining non-MVP academic features. |
| 21 | Attendance API adapter | Connect attendance list/create/transition/exceptions/sync calls to the existing API. |
| 22 | Teacher attendance UI | Wire assigned class selection, register capture, draft/submission, and visible server validation feedback. |
| 23 | Review and follow-up UI | Wire approve/return and absence/lateness exception follow-up; show lifecycle status from server. |
| 24 | Teacher task queue and dashboard | Use server teacher tasks and live permissioned operational reads; remove fabricated KPI values from pilot views. |
| 25 | Attendance acceptance | Validate teacher submission, principal review, denied scope, idempotent retry, and audit evidence. |
| 26 | Gradebook read/write integration | Connect gradebook and score entry to the existing server API and enforce row versions/conflict feedback. |
| 27 | Moderation and publication | Wire submit, review/request changes, approve, publish, and published result reads. |
| 28 | Results and reports | Make pilot result/report output read immutable published snapshots; keep unimplemented report views clearly deferred. |
| 29 | Regression and release rehearsal | Run focused API tests, frontend build, lint, two-role browser walkthroughs, migration/backup/rollback rehearsal. |
| 30 | Pilot go/no-go | Review critical defects, authorization evidence, backup restore, runbook, support owner, and explicit go/no-go sign-off. |

**Replanning rule:** If a day fails its exit check, move dependent work rather than silently skipping the gate. If implementation is split across multiple engineers, tasks can run in parallel only after their listed prerequisites and API contracts are agreed.

## 12. Implementation task board

These are repository-ready implementation tickets, not GitHub issues. `TODO` means not yet accepted as complete; update the status here as work is actually done. Keep the MVP scope narrow and do not start deferred modules during this sprint.

| ID | Priority | Status | Ticket | Acceptance criteria | Depends on |
|---|---|---|---|---|---|
| MVP-01 | P0 | TODO | Confirm pilot scope, roles, and deferred modules | One-page agreed scope; finance, HR, full messaging, and advanced CBT clearly marked out of MVP. | — |
| MVP-02 | P0 | TODO | Establish baseline and test fixtures | Existing typecheck/build/lint and focused API tests run; pilot roles and cross-school fixture are documented. | MVP-01 |
| MVP-03 | P0 | TODO | Harden authentication and active-school UX | Session restore/sign-in/out and unauthorized routing work; errors are visible; server remains authoritative for role and school. | MVP-02 |
| MVP-04 | P0 | TODO | Complete school setup and approval UX | Setup persists/resumes from API; approval path succeeds; failed requests are actionable. | MVP-03 |
| MVP-05 | P0 | TODO | Make student registry server-authoritative | Authenticated register/detail paths do not silently fall back to local records; sync failures are visible. | MVP-03 |
| MVP-06 | P0 | TODO | Finish server-backed admission and document journey | Admission, required uploads, document verification gate, and approval work end-to-end with server validation. | MVP-05 |
| MVP-07 | P0 | TODO | Verify student lifecycle and reconciliation | Transfer/withdraw/approval and migration conflicts are handled and audited; no local-only mutation is presented as saved server data. | MVP-06 |
| MVP-08 | P0 | TODO | Connect academic structure UI to API | Session/term/class/arm/subject operations use API; no demo writes on authenticated MVP paths. | MVP-03, MVP-10 |
| MVP-09 | P0 | TODO | Connect teacher assignments and scope | Assignment administration and teacher scope use API; out-of-scope student access is rejected. | MVP-08 |
| MVP-10 | P0 | TODO | Add missing typed API adapters | Academic, attendance, and gradebook adapters match controller contracts, handle non-2xx errors, and support request cancellation where needed. | MVP-02 |
| MVP-11 | P0 | TODO | Connect attendance register and lifecycle | Authenticated teacher can create/submit; authorized reviewer can return/approve; statuses come from API. | MVP-09, MVP-10 |
| MVP-12 | P1 | TODO | Connect attendance exceptions and sync | Follow-up states persist server-side; retries are idempotent; conflicts are visible, not swallowed. | MVP-11 |
| MVP-13 | P1 | TODO | Connect teacher dashboard tasks and live dashboard data | Teacher task list is scoped; pilot KPI values are API-derived or explicitly shown unavailable. | MVP-09, MVP-11 |
| MVP-14 | P0 | TODO | Connect gradebook policy and score entry | Read/write/policy behavior uses API; validation and optimistic-concurrency conflicts are surfaced. | MVP-09, MVP-10 |
| MVP-15 | P0 | TODO | Connect moderation, publication, and published results | Submission/review/publication lifecycle uses server endpoints; published result view reads immutable snapshots. | MVP-14 |
| MVP-16 | P1 | TODO | Bound report card and verification UI to published data | MVP report view consumes published results; browser-generated/local mock results are not represented as official. | MVP-15 |
| MVP-17 | P0 | TODO | Complete critical-path authorization regression | Tests cover permitted/denied roles, tenant isolation, lifecycle transitions, and audit expectations for MVP flows. | MVP-06, MVP-09, MVP-11, MVP-15 |
| MVP-18 | P0 | TODO | Close document storage production decision | Select private production storage, define malware handling and binary migration/reconciliation, and document operational ownership. | MVP-06 |
| MVP-19 | P0 | TODO | Rehearse production migration, backup, and rollback | Written deploy/rollback steps; backup restore rehearsal; health/readiness checked against the release candidate. | MVP-17, MVP-18 |
| MVP-20 | P0 | TODO | Run pilot go/no-go review | No unresolved critical security/data-loss issue; runbook, support owner, monitoring, and pilot sign-off recorded. | MVP-19 |

## 13. What to build first in code: dependency-ordered checklist

Follow this order. A ticket can be parallelized only if its prerequisites are complete and its API contract is stable.

1. [ ] **Confirm the pilot boundary** — select the pilot roles and explicitly defer modules not required for the first school.
2. [ ] **Capture the baseline** — run the existing scripts and record which failures predate the work.
3. [ ] **Write the flow/contract map** — for each MVP screen, record the API endpoint, payload, capability, and expected error states.
4. [ ] **Close identity and tenant-context gaps** — the signed-in server principal and active school must control access; local role selection must never grant it.
5. [ ] **Finish onboarding persistence** — setup/approval data must load and save through the API with visible failures.
6. [ ] **Make student reads authoritative** — remove silent local-data fallback for authenticated pilot sessions.
7. [ ] **Finish admission + documents** — server create, upload, verify/reject, download, required-document gate, and audit behavior.
8. [ ] **Finish student lifecycle and reconciliation** — approve, transfer, withdraw, and local-data conflict handling.
9. [ ] **Connect academic structure** — sessions/terms/classes/arms/subjects first, since assignments and attendance depend on their IDs.
10. [ ] **Connect teacher assignments and scope** — prove teacher authorization before wiring teacher-operated screens.
11. [ ] **Create/complete typed API adapters** — academic, attendance, and gradebook adapters should reflect the current controllers and normalize API errors consistently.
12. [ ] **Wire attendance capture and review** — teacher create/submit, principal/admin return/approve, exceptions, and retries.
13. [ ] **Wire dashboard tasks and operational summaries** — consume permissioned API values; remove or label static demo metrics.
14. [ ] **Wire gradebook and result lifecycle** — scores/policy, optimistic concurrency, moderation, publication snapshots, and authorized result view.
15. [ ] **Run cross-cutting validation** — authorization denials, second-school isolation, audit, browser flows, error/restricted states.
16. [ ] **Complete deployment safeguards** — storage decision, migration/rollback, backup restore, readiness, observability, and pilot runbook.
17. [ ] **Pilot go/no-go** — launch only the validated scope; retain unintegrated screens as unavailable/deferred, not as implied working features.

## 14. Frontend/backend split and exact files

Paths are repository-relative. “Existing” files below are likely edit targets; “create if absent” means add the adapter or test only after confirming no equivalent exists. A page is not complete just because it renders: authenticated pilot data must come from the server and failures must be visible.

| Module | Frontend files | Backend files | Focused validation |
|---|---|---|---|
| Identity and onboarding | `src/routes/index.tsx`, `src/routes/register-school.tsx`, `src/routes/setup.tsx`, `src/routes/superadmin.tsx`, `src/lib/identity-api.ts`, `src/lib/role-context.tsx`, `src/lib/school-api.ts`, `src/lib/platform-api.ts`, `src/components/shell/app-shell.tsx` | `apps/api/src/identity/auth.controller.ts`, `auth.guard.ts`, `auth.service.ts`, `session.service.ts`, `apps/api/src/school/school.controller.ts`, `school.service.ts`, `school.repository.ts`, `apps/api/src/authorization/authorization.service.ts`, `apps/api/src/common/env.ts`, `health.controller.ts` | `apps/api/test/identity-tenancy.test.ts`; package scripts `api:test`, `api:typecheck`; login/setup browser walkthrough |
| Student registry, admission, and documents | `src/routes/people.students.index.tsx`, `src/routes/people.students.new.tsx`, `src/routes/people.students.$studentId.tsx`, `src/routes/people.students.ids.tsx`, `src/data/student-store.ts`, `src/lib/student-api.ts`, `src/lib/student-migration.ts` | `apps/api/src/students/student.controller.ts`, `student.service.ts`, `student.repository.ts`, `student-document.controller.ts`, `student-document.service.ts`, `student-document.repository.ts`, `document-storage.service.ts`, `movement.controller.ts`, `movement.service.ts`, `movement.repository.ts` | `apps/api/test/student-workflow.test.ts`, `student-transfer.test.ts`; scripts `api:student:test` and `api:student-transfer:test` |
| Academic structure and teacher assignments | `src/routes/academics.tsx`, `src/lib/academic-context.tsx`, `src/data/academics.ts`, `src/data/academic-structure-store.ts`, `src/data/academic-store.ts`; create `src/lib/academic-api.ts` if no existing adapter provides these calls | `apps/api/src/academics/academic.controller.ts`, `academic.service.ts`, `academic.repository.ts`, `assignment.controller.ts`, `assignment.service.ts`, `assignment.repository.ts`, `apps/api/src/teacher-dashboard/teacher-dashboard.controller.ts`, `teacher-dashboard.service.ts`, `teacher-dashboard.repository.ts` | `apps/api/test/identity-tenancy.test.ts`, `teacher-dashboard.test.ts`, `attendance-workflow.test.ts`; add focused assignment test if existing tests do not cover the contract |
| Attendance and teacher tasks | `src/routes/attendance.tsx`, `src/routes/dashboard.tsx`, `src/data/attendance-store.ts`, `src/data/attendance-operations-store.ts`, `src/components/nav-config.ts`; create `src/lib/attendance-api.ts` if absent | `apps/api/src/attendance/attendance.controller.ts`, `attendance.service.ts`, `attendance.repository.ts`, `apps/api/src/teacher-dashboard/teacher-dashboard.controller.ts`, `teacher-dashboard.service.ts`, `teacher-dashboard.repository.ts` | `apps/api/test/attendance-workflow.test.ts`, `teacher-dashboard.test.ts`; scripts `api:attendance:test`, `api:teacher-dashboard:test` |
| Gradebook, moderation, publication, results | `src/routes/assessment.tsx`, `src/routes/reports.tsx`, `src/routes/verify.tsx`, `src/data/gradebook-store.ts`, `src/data/assessment-workflow.ts`, `src/data/result-publication-store.ts`, `src/data/report-card-store.ts`; create `src/lib/gradebook-api.ts` if absent | `apps/api/src/gradebook/gradebook.controller.ts`, `gradebook.service.ts`, `gradebook.repository.ts`, `publication.controller.ts`, `publication.service.ts`, `publication.repository.ts`, `results.controller.ts`, `results.service.ts`, `results.repository.ts` | `apps/api/test/gradebook.test.ts`, `publication.test.ts`, `results.test.ts`, `gradebook-correction.test.ts`, `assessment-authorization-concurrency.test.ts`; scripts `api:gradebook:test`, `api:publication:test`, `api:results:test`, `api:assessment:test` |
| Dashboard and launch quality | `src/routes/dashboard.tsx`, `src/components/kit/kpi-card.tsx`, `src/components/kit/page.tsx`, `src/lib/error-page.ts`, `src/lib/error-capture.ts` | `apps/api/src/common/health.controller.ts`, `apps/api/src/common/request-context.middleware.ts`, `apps/api/src/audit/audit.service.ts`, `apps/api/src/database/client.ts`, `apps/api/drizzle/` migrations and config | `npm run api:typecheck`, focused API tests from the changed module, `npm run build`, `npm run lint`; deployment/backup/restore rehearsal |

### Explicitly deferred frontend surfaces

Do not spend MVP sprint time wiring these unless the pilot scope is formally changed: `src/routes/finance.tsx`, `src/routes/finance/fees.tsx`, `src/routes/finance/invoices.tsx`, `src/routes/finance/payments.tsx`, `src/routes/finance/receipts.tsx`, `src/routes/communication.tsx`, `src/routes/operations.tsx`, `src/routes/people.staff.new.tsx`, and the advanced CBT/exam authoring flows in `src/routes/examinations.tsx`. Their presence in the app is not evidence that they are server-backed or launch-ready.

## 15. Daily completion and status update rule

At the end of each working day:

1. Update the matching ticket status and note any blocker or changed estimate.
2. Record the exact validation command and result for code changes.
3. Update [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md) when a backend slice meets its documented completion definition; this MVP plan does not override its status authority.
4. Do not mark a feature done if it still depends on browser-local operational writes, unverified authorization, or silent failure behavior.
