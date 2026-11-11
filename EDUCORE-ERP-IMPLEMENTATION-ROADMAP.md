# EduCore ERP Implementation Roadmap

> **Status authority:** This document is retained for ERP product scope and detailed requirements only. Its historical checkboxes are not authoritative. Use [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md) for current backend phase and slice status.

This is the source-of-truth implementation plan for the EduCore school ERP. Each phase is built on the data, permissions, workflows, and audit trail from the previous phase.

## Build rule

Every module must include:

- Data model and persistence boundary
- List, detail, and action workflows
- Status lifecycle and approval logic
- Role-based access
- Audit trail
- Empty, loading, error, and restricted states
- Import and export where operational records require it
- Tests or focused build validation before the slice is pushed

Each completed slice must update this file, create a focused commit, and push to `origin/main`.

## Phase 1 - Foundation and school governance

Goal: define the operating rules of the school before dependent modules are used.

- [x] School setup wizard: profile, session, terms, class structure, grading
- [x] Persistent setup progress and resume behavior
- [x] Governance step with approval hierarchy and role access baseline
- [x] Audit trail policy in setup
- [x] Persistent go-live checklist and completion states
- [x] Durable school profile and settings persistence (server API pending)
- [~] Administrator onboarding: school profile, setup progress, and go-live checklist are server-backed; academic structure, grading, and governance persistence remain
- [x] Fresh-data reset: local operational browser records cleared, student fallback is empty, and local PostgreSQL contains no seeded students/documents/setup rows
- [x] Pre-dashboard administrator onboarding route and platform superadmin school approval dashboard
- [x] Full permission matrix editor with administrator-only persistence
- [x] Approval hierarchy editor with named staff accounts
- [x] Central audit log storage and retention policy (browser persistence; server API pending)

## Phase 2 - Student registry and admissions

Goal: create the central student master record and lifecycle.

- [x] Persisted student registry and global search integration
- [x] Complete admission form data flow
- [x] Required document validation
- [x] Pending approval admission status
- [x] Registry approval action
- [x] Student admission audit history
- [x] Live audit tab on student profile
- [x] Pending admissions queue with bulk review
- [x] Transfer and withdrawal workflow with reasons and effective dates
- [x] Student profile history and guardian verification workflow
- [~] Server-backed student and document storage (schema, generated migration, API, private local storage, admission integration, lifecycle UI, and metadata migration executor delivered; database rollout, binary migration, and production object storage remain)

### Phase 2 server-backed storage progress

- [x] Student and guardian PostgreSQL schema with stable IDs, school tenancy, lifecycle status, and admission-number uniqueness
- [x] Authenticated student create, read, update, approval, transfer, and withdrawal API with capability checks and audit events
- [x] Private local document storage adapter with multipart upload, checksum validation, replacement, authorized download, and deletion
- [x] Required admission-document verification gate before server approval
- [x] Typed browser API adapter and registry/profile/admission integration with local fallback and visible sync errors
- [x] Migration preview and sequential non-conflicting create executor with JSON conflict/failure report
- [x] Apply migrations and seed against a real PostgreSQL instance (PostgreSQL 18, API health, seeded sign-in, and current-user session verified)
- [x] Verify local PostgreSQL runtime availability (native service `postgresql-x64-18`, port 5432 reachable)
- [ ] Upload and reconcile existing document binaries; add malware scanning and production S3-compatible storage with short-lived URLs
- [ ] Reconcile guardians and local audit history without data loss
- [ ] Add migration, permission, and browser workflow tests against real authenticated sessions
- [x] Live PostgreSQL student create/read/duplicate-admission workflow test
- [x] Live PostgreSQL required-document upload/verification/approval-gate workflow test
- [x] Live PostgreSQL document replacement/download/deletion and transfer/withdrawal workflow test
- [x] Live PostgreSQL cross-school student read-isolation workflow test
- [x] Browser local sign-in smoke test reaches authenticated dashboard
- [ ] Make the server authoritative after reconciliation and remove browser-only writes

## Phase 3 - Academic structure

Goal: organize classes, subjects, teachers, curriculum, and timetable.

- [x] Persisted teacher-to-class-subject assignments
- [x] Assignment visibility in class cards and subject directory
- [x] Assignment-aware timetable teacher display
- [x] Editable timetable slots with persistence
- [x] Subject and class-arm creation workflow
- [x] Teacher workload and conflict detection
- [x] Timetable clash validation
- [x] Curriculum and scheme-of-work ownership
- [x] Academic calendar workflow

## Phase 4 - Attendance and class operations

Goal: capture daily operations and turn exceptions into action.

- [x] Attendance register submission lifecycle
- [x] Principal/admin approval and return-for-correction
- [x] Persisted absence follow-up queue
- [x] Contacted and resolved follow-up states
- [x] Live attendance approvals on dashboard
- [x] Live absence follow-up alerts on dashboard
- [x] Teacher attendance and lateness workflow
- [x] Repeated absence and lateness alerts
- [x] Guardian contact history and communication handoff
- [x] Device sync queue and offline reconciliation (browser persistence; server API pending)

## Phase 5 - Assessment, examinations, and results

Goal: support controlled mark entry, CBT, moderation, publishing, and report cards.

- [x] Assignment-scoped teacher access to gradebooks
- [x] Nigerian component scoring: CA1 20, CA2 20, Assignment 10, Exam 50
- [x] Independent exam entry with total calculation and ceiling validation
- [x] Excel gradebook import and export
- [x] Session and term-scoped gradebook persistence with inheritance
- [x] School CBT result written to the official examination component
- [x] Practice CBT kept separate from official results
- [x] Gradebook moderation metadata and correction reason
- [x] Assessment audit events for mark and lifecycle actions
- [x] Full component scores shown in student profile and report card
- [x] Moderation queue with reviewer permissions, component totals, exceptions, and audit actions
- [x] CBT session candidate registration and persisted attempt records (server API pending)
- [x] Result publishing notifications and verification endpoint (browser persistence; server API pending)
- [x] Promotion, retention, and graduation rules with reviewer approval

## Phase 6 - Finance and billing

Goal: manage fee structures, invoices, collections, reconciliation, and debt follow-up.

- [x] Fee structure by session, term, class, and category
- [x] Invoice generation and approval
- [x] Payment posting and receipt issuance
- [x] Reconciliation workflow
- [x] Discounts, scholarships, and waivers
- [x] Debt tracking and follow-up queue
- [x] Financial reports and export
- [x] Finance audit trail and segregation of duties

### Finance remediation program

The original finance checklist above describes the intended capabilities, but the first implementation mixed overview actions with workflow screens. The remediation program below is the active source of truth until every slice is validated and pushed.

#### Slice F1 - One finance source of truth

- [x] Finance overview operational invoice/payment actions use dedicated workflow screens
- [x] Invoice creation and approval use the shared finance store everywhere
- [x] Payment posting uses the shared invoice/payment/allocation/receipt transaction everywhere
- [x] Receipt rendering is shared by invoice, payment, and receipt screens
- [x] Legacy localStorage records are normalized and clearly marked
- [x] Focused lint, build, and browser workflow check for the current F1 work
- [x] Current F1 work committed and pushed to `origin/main`

#### Slice F2 - Fee schedule governance

- [x] Fee schedule draft, publish, and archive lifecycle
- [x] Schedule version, author, approver, and published timestamp metadata
- [x] Published schedules cannot be silently changed after invoice generation
- [x] Exact class level or explicit class-group support
- [x] Mandatory/optional and recurring/one-time fee rules
- [x] Delete confirmation and unsaved-change protection
- [x] Focused validation, commit, and push for the delivered governance metadata and lifecycle

#### Slice F3 - Invoice operations

- [x] Period-scoped invoice generation with duplicate prevention
- [x] Invoice detail route with line items, adjustments, approvals, and activity
- [x] Preview with school identity, billing contact, student identity, due date, and payment instructions
- [x] Print stylesheet and PDF/local download
- [x] Role-based approval queue and notifications
- [x] Focused validation, commit, and push

#### Slice F4 - Collections and receipts

- [x] Payment selection is invoice-first, not student-balance-first
- [x] Partial payments, allocations, overpayment handling, reversals, and refunds
- [x] Bank/POS reconciliation with review and resolution states
- [x] Receipt entity with issue, reprint, void, and audit lifecycle
- [x] Shared receipt document renderer
- [x] Focused validation, commit, and push

#### Slice F5 - Adjustments, reporting, and access

- [x] Discounts, waivers, and scholarships attach to invoice/line and period
- [x] Finance reports aggregate the same period-scoped source records as the screens
- [x] Capability-level permissions for create, approve, post, reverse, reconcile, and export
- [x] Parent/student visibility limited to linked published documents
- [x] Focused validation, commit, and push

#### Push policy

No slice is marked complete until its focused check passes, its commit is created, and the commit is pushed to `origin/main`. Existing unrelated worktree changes must be reviewed before inclusion rather than silently discarded.

## Phase 7 - Parent communication and engagement

Goal: make communication event-driven and traceable.

- [x] Attendance alerts
- [x] Fee reminders and receipts
- [x] Exam and result notifications
- [x] Announcements and meeting notices
- [x] Message templates and audience rules
- [x] Delivery status and communication history
- [x] Parent-focused summaries

## Phase 8 - Reporting, analytics, and leadership dashboards

Goal: provide reliable decision support from the operational modules.

- [x] Whole-school KPI dashboard from live stores
- [x] Class performance and assessment reports
- [x] Attendance trends and exception analytics
- [x] Fee collection and debt trends
- [x] Examination performance analytics
- [x] Alert board and leadership summaries
- [x] Historical reports with session and term filters
- [x] Exportable and permission-aware reporting

## Commit ledger

| Date       | Commit     | Slice                                            | Status                    |
| ---------- | ---------- | ------------------------------------------------ | ------------------------- |
| 2026-08-24 | `7f958b1`  | favicon app branding                             | Pushed                    |
| 2026-08-24 | `cb3b701`  | persisted academic teacher assignments           | Pushed                    |
| 2026-08-24 | `50e17fe`  | editable persisted timetable                     | Pushed                    |
| 2026-08-24 | `520bdbb`  | attendance register review workflow              | Pushed                    |
| 2026-08-24 | `7d12983`  | absence follow-up queue                          | Pushed                    |
| 2026-08-24 | `b91fdb1`  | live attendance approvals on dashboard           | Pushed                    |
| 2026-08-24 | `5ab89af`  | 100-mark gradebook policy                        | Pushed                    |
| 2026-08-24 | `527db76`  | Excel gradebook import/export                    | Pushed                    |
| 2026-08-24 | `6a4195f`  | School CBT scores to gradebooks                  | Pushed                    |
| 2026-08-25 | `da38e6f`  | full student result components                   | Pushed                    |
| 2026-08-25 | `5ee26af`  | secure gradebook score entry and audit           | Pushed                    |
| 2026-08-25 | `48ea471`  | finance remediation roadmap and workflow routing | Pushed                    |
| 2026-08-25 | `2794933`  | fee schedule governance metadata and lifecycle   | Pushed                    |
| 2026-08-25 | `WORKTREE` | reviewer-facing gradebook moderation queue       | Implemented; build passed |

## Next slice

Continue with the server-backed student and document storage slice described in [EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md](EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md). This is the remaining foundation item before further platform hardening.
