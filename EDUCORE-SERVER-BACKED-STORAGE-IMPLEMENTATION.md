# EduCore Server-Backed Storage Implementation

> **Status authority:** This document contains the student/document migration contract and detailed checklist only. Use [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md) for authoritative phase and slice status.

This document defines the next implementation slice after finance: moving student records and required documents from browser-only persistence to a server-backed storage boundary.

## Objective

Provide durable, multi-user storage for student master records and admission documents while preserving the current route workflows, role permissions, audit history, and local development experience.

## Delivery status

Status markers: `[x]` delivered and validated, `[~]` partially delivered with explicit follow-up, `[ ]` remaining.

- [x] Server schema, migrations, repositories, and authenticated student lifecycle API
- [x] Private local document storage, multipart upload, checksum validation, replacement, authorized download, and deletion
- [x] Required-document verification gate before admission approval
- [x] Typed frontend API adapter and registry, admission, and profile integration with local fallback
- [x] Migration preview, normalized admission matching, non-conflicting execution, and JSON conflict/failure report
- [x] Live administrator school setup persistence verified through the authenticated API workflow
- [x] Pre-dashboard setup routing and platform superadmin school approval path added
- [~] Production storage boundary: local private storage is available for development; S3-compatible storage, malware scanning, quarantine, and short-lived presigned URLs remain
- [~] Reconciliation: student metadata executor is available; guardian records, document binaries already stored in browser state, and local audit history still require explicit migration
- [x] Local PostgreSQL migration application and administrator seed: PostgreSQL 18 is running on port 5432, migrations applied, seed completed, API health returned 200, and seeded sign-in plus `/api/auth/me` returned 200
- [x] Database-backed student workflow smoke test: authenticated school selection, student create, read-back, and duplicate admission rejection verified against PostgreSQL
- [x] Database-backed document workflow smoke test: required-document approval blocking, multipart upload, listing, verification, and approval verified against PostgreSQL
- [x] Live replacement, authorized download, deletion, transfer, and withdrawal workflow verified against PostgreSQL
- [x] Multi-school session isolation verified: a student created under one active school returns `404` from a second school session

## Live onboarding verification - 2026-09-08

- [x] Impact Breed School, Maya Lagos. approved through the authenticated platform superadmin workflow
- [x] Approved school status changed from `trial` to `active`
- [x] School administrator remains tenant-scoped and separate from the platform superadmin session
- [x] Browser sign-in smoke test: seeded administrator signed in through the local UI and reached the authenticated dashboard with school context
- [~] Browser admission/document upload workflow automation remains
- [x] Local PostgreSQL runtime definition: native PostgreSQL 18 is installed and healthy; Docker Compose remains available as an alternative local runtime
- [ ] Server-authoritative cutover after reconciliation and removal of browser-only writes

## Form standard

Student and document workflows must use multi-step forms. The minimum flow is:

1. Record identity and ownership.
2. Capture or upload documents.
3. Validate required fields and document status.
4. Review the record.
5. Submit and show the next status, owner, and record ID.

Single-step forms are reserved for atomic one-field updates that do not create an approval-bound record. Any server-backed create, upload, replacement, approval, transfer, or withdrawal workflow with multiple fields must use the multi-step pattern with draft recovery and validation.

## Scope

- Server API for student create, read, update, approval, transfer, withdrawal, and document metadata
- Persistent student and guardian records keyed by stable IDs
- Document upload, download, replacement, and deletion workflows
- Document metadata: type, original filename, MIME type, size, checksum, uploader, uploaded time, and status
- Admission document requirements and validation before approval
- Server-side authorization for administrator, principal, admissions, teacher, parent, student, and security roles
- Audit events for student mutations and document lifecycle actions
- Session and school tenancy boundaries on every request
- Migration of existing browser-local records without duplicate students or documents
- Loading, empty, error, offline, and restricted states in the existing registry and profile screens

## Recommended Boundary

Keep domain rules in the existing student and audit stores, but add a server repository/API adapter beneath them. Route components should continue to call domain functions rather than making direct HTTP requests.

```text
Routes and UI
    -> student domain store
        -> server repository/API
            -> database and object storage
```

The browser may retain a short-lived cache for responsiveness, but the server is the source of truth after sign-in and successful synchronization.

## Data Contracts

### Student

- `id`
- `schoolId`
- `admissionNo`
- `firstName`, `middleName`, `lastName`
- `dateOfBirth`, `gender`, `nationality`
- `classId`, `armId`, `session`
- guardian contacts and relationship
- admission status and effective dates
- created/updated timestamps and actor IDs

### Student document

- `id`
- `studentId`
- `schoolId`
- document type and requirement key
- storage key and immutable checksum
- original filename, MIME type, and byte size
- verification status: `Pending`, `Verified`, `Rejected`
- rejection reason, uploader, verifier, and timestamps

## Security Rules

- Every query is scoped by authenticated `schoolId`; client-provided school IDs are never trusted.
- Parents and students can read only linked students and published/verified documents permitted by policy.
- Teachers can view only students assigned to their current classes or subjects.
- Admissions staff can create and edit pending admissions but cannot approve unless granted approval capability.
- Administrators and principals can approve, reject, transfer, and withdraw records according to the approval hierarchy.
- Document download endpoints issue authorized, short-lived access rather than exposing storage keys.
- Validate MIME type, file size, checksum, filename, and malware-scanning status before publication.
- Record denied access attempts in the audit log.

## Migration Plan

1. Add server schema and repository contracts without changing current screens.
2. Export existing local student and document metadata into a versioned migration payload.
3. Match records using school ID, admission number, and normalized identity fields.
4. Import only records not already present; produce a conflict report for ambiguous matches.
5. Upload document binaries separately and verify checksums after transfer.
6. Enable read-through fallback during rollout, then make the server authoritative.
7. Remove browser-only writes after reconciliation and retain a backup export.

### Implemented migration boundary

`src/lib/student-migration.ts` provides a non-destructive preview and sequential executor. Preview matching uses normalized `admissionNo` only and compares first name, last name, gender, date of birth, class, and arm. Rows are classified as `create`, `already-migrated`, or `conflict`; execution creates only `create` rows, treats server duplicate responses as per-row conflicts, preserves local records, and can download a JSON report. This is intentionally not the final cutover: document binaries and ambiguous identity conflicts must be reviewed before server authority is enabled.

## Acceptance Checks

- A student created in one browser is visible in another authorized session.
- Refreshing or signing out does not lose approved student data or document metadata.
- Duplicate admission numbers are rejected server-side.
- Required documents block approval until valid uploads are verified.
- Unauthorized roles cannot read, mutate, or download restricted records.
- Parent/student views show only linked published documents.
- Transfer and withdrawal actions preserve history and create audit events.
- Failed uploads can be retried without creating duplicate document records.
- Offline or API failure states preserve unsynced work and explain the recovery action.
- Focused API, permission, migration, and browser workflow checks pass before push.

## Delivery Checklist

- [x] Server schema and migrations
- [x] Authenticated student repository/API
- [~] Object storage adapter and secure document access (private local adapter delivered; production object storage and short-lived URLs pending)
- [x] Server-side validation and authorization
- [~] Local data migration utility and conflict report (metadata preview/executor delivered; binary and guardian reconciliation pending)
- [x] Registry, admission, and profile UI integration
- [x] Audit and error handling integration
- [~] Focused tests and build validation (API/typecheck/build checks pass; dedicated migration and browser tests pending)
- [ ] Commit and push to `origin/main`
