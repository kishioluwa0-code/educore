# EduCore Complete Application Audit and Backend Recommendation

> **Status authority:** This is an audit and architecture recommendation, not the delivery tracker. Use [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md) for current implementation status and next-slice selection.

**Prepared by Manus AI — 4 September 2026**

## Executive conclusion

EduCore is a strong, unusually broad **school-operations product prototype** with a coherent Nigerian-school domain model, a visually credible administrative shell, and substantial workflow intent. The repository already covers the vocabulary of a school ERP: admissions, students, guardians, staff, academics, attendance, assessment, examinations, finance, communication, reporting, governance, and audit. The product direction is materially better than a generic dashboard.

However, the repository is not yet a production full-stack system. It is a **client-side workflow simulator with server-rendered application plumbing**. The application has no real authentication, no server business API, no database, no object-storage integration, no server-enforced authorization, no automated tests, no CI/CD definition, and almost all operational state is written to browser `localStorage`. The existing UI often communicates a higher level of operational assurance than the implementation currently provides.

The recommended target is a **modular TypeScript monolith backed by PostgreSQL**, with a dedicated application API, Drizzle ORM, Redis-backed jobs, S3-compatible private object storage, real identity/session management, structured authorization, immutable audit events, and end-to-end tests. Keep the current React/TanStack Start frontend initially; do not split into microservices yet. The domain is relational, transaction-heavy, multi-tenant, and approval-driven, so PostgreSQL is a better foundation than a document database or a browser-first synchronization model.

> **Most important product decision:** treat the current UI and local stores as a valuable prototype and migration source, not as a security boundary or production data layer.

## 1. Audit scope and evidence

The audit covered the public repository, the complete Markdown planning set, the route and component structure, authentication context, representative student, gradebook, finance, HR, attendance, CBT, and shell implementations, build/lint behavior, deployment artifacts, and dependency hygiene.

| Evidence | Finding |
|---|---|
| 26 route files, 112 TypeScript/TSX files, 20 data-store modules | Broad functional surface with significant domain complexity |
| 97 direct `localStorage` references in `src` | Browser persistence is the dominant data layer |
| 82 route/component imports from local data modules | UI is tightly coupled to static or browser-local stores |
| 21 prompt/confirm/alert call sites | Several substantial workflows still bypass the guided-form standard |
| 0 test files discovered | No automated regression or authorization suite is present |
| `npm run build` | Successful production build |
| `npm run lint` | Fails with 1,177 problems, including 1,162 errors and 15 warnings |
| `npm audit --omit=dev` | One high-severity direct vulnerability in `xlsx`, with no automatic fix available |
| ERP roadmap | 106 checked items and 1 unchecked top-level item, but the separate workflow tracker marks only early slices complete |
| Server-backed storage document | The next intended slice is student/document persistence, but its delivery checklist remains entirely unchecked |

The source of truth for the domain roadmap is [`EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md`](https://github.com/imageandkolors/educore1/blob/main/EDUCORE-ERP-IMPLEMENTATION-ROADMAP.md). The workflow tracker is [`EDUCORE-PRIMARY-CLASS-TEACHER-ACCESS-IMPLEMENTATION.md`](https://github.com/imageandkolors/educore1/blob/main/EDUCORE-PRIMARY-CLASS-TEACHER-ACCESS-IMPLEMENTATION.md), and the immediate persistence design is [`EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md`](https://github.com/imageandkolors/educore1/blob/main/EDUCORE-SERVER-BACKED-STORAGE-IMPLEMENTATION.md).

## 2. Product and education-workflow assessment

### What is working well

EduCore has the foundations of a differentiated product. The roadmap understands that a school ERP is not merely a dashboard: it requires ownership, approval, lifecycle status, auditability, session/term scope, imports/exports, and operational handoffs. The finance remediation program is especially strong conceptually because it separates invoice generation, approval, payment posting, allocation, receipt issuance, reversals, refunds, reconciliation, and capability-level permissions.

The education model also shows good domain judgment. The documentation distinguishes class-teacher ownership from subject-teacher permissions, separates Practice CBT from official School CBT, recognizes Nigerian assessment weighting, and describes a candidate snapshot plus authoritative expiry for CBT attempts. These are the right concepts for avoiding ambiguous ownership and accidental result publication.

### Product gaps to close

The primary gap is **operational truthfulness**. The screens imply durable, multi-user records, but the current implementation writes most changes to one browser profile. A school administrator using a second browser will not see the same state. Approval, audit, finance, and published-result semantics are therefore not authoritative.

The second gap is **cross-module continuity**. Many workflows stop at a toast, a local mutation, or a static card. Admissions must create or update enrolment, class eligibility, attendance, assessment, examination, and guardian relationships. Teacher onboarding must feed assignment eligibility, attendance, communication, and HR queues. Result publication must feed student/parent views and notifications. Finance must feed linked invoices, receipts, reconciliation, and parent visibility. These relationships need explicit domain events or transactional application services.

The third gap is **role-specific product experience**. The documentation correctly calls for dedicated Student and Parent journeys, but the current navigation still exposes broad shared routes and then relies on client-side restrictions. Teachers, parents, students, HR, and administrators need different task queues, not just different menu visibility.

| Product area | Current maturity | Critical gap |
|---|---:|---|
| School setup/governance | High-fidelity prototype | Configuration and approval hierarchy remain browser-local |
| Student registry/admissions | Rich workflow prototype | No server identity, uniqueness, durable records, or document binaries |
| Academics | Strong domain intent | Assignment and scope rules are not server-authoritative |
| Attendance | Good lifecycle UI | Offline reconciliation, conflict handling, and server approval are missing |
| Assessment/results | Richest workflow area | Gradebooks, moderation, publication, and corrections are locally mutable |
| CBT/examinations | Prototype | No authoritative timing, autosave, candidate snapshot, or concurrency control |
| Finance | Strong conceptual workflow | Financial transactions require database transactions, idempotency, and immutable ledger/audit semantics |

## Implementation update - 2026-09-08

Fresh onboarding cleanup removed demo staff from approval configuration. The setup wizard now provides editable sessions/terms, class arms, grading rows, school-type grading defaults, and a four-component 100% assessment weighting model. Governance owners are unavailable until staff are onboarded and verified. The backend academic-scope foundation is server-backed and tenant-aware through migration `0007_academic_scope` and `GET /api/academics/me/scope`.
| HR/payroll boundary | Early | Sensitive payroll data lacks a real field-level/server permission boundary |
| Communication | Mostly modeled | Delivery providers, retries, templates, and message history need backend jobs |
| Reporting | Visually present | Reports must query approved server records, not seed data or unfiltered local state |

## 3. UX and product-design audit

The administrative shell is visually coherent: persistent navigation, clear module groupings, session/term selectors, search affordance, status badges, and responsive layout are appropriate for an internal school operating system. The restrained navy/teal design language is aligned with trust and administrative clarity.

The main UX debt is not visual polish; it is **workflow reliability and feedback**. The current experience needs a consistent state model for loading, empty, restricted, error, offline, retry, draft recovery, conflict, approval, and completed handoff. A successful toast is not enough for a workflow that changes a student’s admission, a gradebook’s publication status, or a financial receipt.

The documented multi-step standard is correct and should become a reusable product primitive. Any form that creates, uploads, transfers, withdraws, approves, publishes, or changes ownership should have named steps, validation, draft persistence, review, confirmation, record ID, next owner, and status. The remaining prompt-based flows should be removed rather than expanded.

High-priority UX changes are:

1. Replace role-selection sign-in with a real account sign-in and clear school context.
2. Create separate navigation shells or task views for administration, teacher, parent, and student users.
3. Add a global workflow status component showing owner, status, timestamps, reason, and next action.
4. Make every mutation visibly idempotent and retryable, especially payments, uploads, attendance, marks, and CBT answers.
5. Introduce a consistent “saved locally / syncing / synced / conflict / failed” language for offline-capable workflows.
6. Replace numeric dashboard claims that are not yet connected to authoritative records with honest empty or setup states.

## 4. Frontend architecture assessment

The current frontend uses React, TanStack Router/Start, Tailwind, Radix primitives, and local domain modules. This is a viable foundation and should not be discarded. The problem is the boundary: route components frequently know too much about storage, seed data, role logic, and workflow mutation. Large route files such as assessment, dashboard, finance, attendance, setup, and student profile have become feature applications rather than thin composition layers.

The frontend should evolve toward the following boundary:

```text
Route/page component
  -> feature hook / query adapter
    -> typed API client
      -> application service
        -> domain policy + transaction
          -> PostgreSQL / object storage / job queue
```

The existing data stores can be preserved temporarily as domain-shaped interfaces, but their implementation should be replaced behind those interfaces. This matches the server-backed storage document’s recommended boundary: routes should continue calling domain functions while a repository/API adapter becomes the source of truth.

Frontend engineering gaps include the absence of query caching and invalidation conventions, no typed API contract, no error-boundary test coverage, no formal component test setup, no end-to-end browser tests, and severe formatting/lint drift. The codebase should also split the largest routes into feature modules before backend integration accelerates the problem.

## 5. Backend, data, and security assessment

### Authentication and authorization

The current sign-in flow is demo-only. The route accepts any visible email/password values, lets the user choose a role, writes `educore.authenticated=true` to `localStorage`, and navigates to the dashboard. The role context stores the active role and profile in `localStorage`; there is no password verification, token/session lifecycle, school membership lookup, MFA, device verification, refresh/revocation model, or server-side authorization. The relevant implementation is [`src/lib/role-context.tsx`](https://github.com/imageandkolors/educore1/blob/main/src/lib/role-context.tsx) and [`src/routes/index.tsx`](https://github.com/imageandkolors/educore1/blob/main/src/routes/index.tsx).

The shell’s route map is useful for presentation, but it is not protection. Record-level checks must be performed using authenticated identity, school membership, role/capability, assignment scope, session, term, and relationship. This directly maps to OWASP API risks for broken object-level authorization, broken authentication, broken object-property authorization, broken function-level authorization, and unrestricted sensitive business flows [1].

### Persistence and data integrity

Student, staff, finance, attendance, gradebook, audit, communication, settings, and academic records are stored in browser-local keys. Client-generated IDs and admission numbers cannot provide uniqueness under concurrent users. Local audit events can be deleted or altered by the user. The browser cannot guarantee transaction boundaries for invoice/payment/receipt workflows or approval transitions.

PostgreSQL is the right core because EduCore needs referential integrity, unique constraints, joins across school/session/term/class/student relationships, transactional workflows, reporting queries, and controlled concurrency. PostgreSQL row-level security can provide a defense-in-depth tenancy layer, but policies must be designed and tested carefully; PostgreSQL defaults to deny when RLS is enabled without applicable policies, while table owners and bypass roles require special care [2].

Financial posting, gradebook publication, admissions approval, transfer, withdrawal, and CBT answer autosave need idempotency keys, optimistic locking or version columns, and explicit transaction boundaries. PostgreSQL’s transaction isolation model provides the primitives, but application code still must choose the correct isolation and retry behavior for each workflow [3].

### Documents and uploads

The admission flow currently records document metadata rather than securely storing and verifying document binaries. The target design should use private object storage, short-lived authorized download URLs, generated storage keys, file-size and extension allowlists, MIME and signature validation, checksum verification, malware scanning, and audit events. OWASP specifically recommends authorized uploads, generated filenames, size limits, storage outside the webroot or on a separate server, antivirus/sandboxing where available, and CSRF protection [4].

### Security and privacy gaps

EduCore processes children’s data, guardian contact data, staff employment information, financial records, assessment results, and identity documents. The application therefore needs privacy-by-design controls rather than only authentication.

| Security control | Current state | Required target |
|---|---|---|
| Real identity/session | Missing | OIDC or managed auth, secure HTTP-only cookies, session revocation, device/session list |
| Tenant boundary | Missing | `school_id` on all tenant records, server context, database policies, cross-tenant tests |
| RBAC/ABAC | Client role checks | Server capability checks plus relationship/assignment scope policies |
| Audit | Local mutable events | Append-only server audit ledger with actor, action, object, before/after, reason, IP/device metadata |
| Sensitive fields | Same local object model | Separate projections/capabilities for payroll, bank, tax, medical and identity data |
| Uploads | Names/metadata only | Private object storage, scanning, checksum, secure download, retention/deletion policy |
| Rate limiting | Not present | Per-user/IP/tenant limits, especially auth, uploads, exports, CBT, messages, and payments |
| CSRF/session security | Not present | Same-site cookies, CSRF strategy, origin checks, secure headers, idle/session expiry |
| Monitoring | Console/error wrapper | Structured logs, traces, alerts, audit monitoring, incident response runbook |
| Dependency security | High `xlsx` advisory | Replace or isolate vulnerable parser, lockfile scanning, SBOM, automated update policy |

The production output currently contains only a cache-control header for assets. A deployed application should add a deliberate header policy: HSTS, CSP, frame-ancestors, content-type sniffing protection, referrer policy, permissions policy, and secure cookie settings, while testing the CSP against the app’s assets.

### DevOps and quality gaps

The repository builds successfully, but lint fails with 1,177 problems. There are no discovered automated test files, no visible CI workflow, no migration pipeline, no environment schema, no deployment runbook, no backup/restore rehearsal, no seed strategy, no staging gate, and no observability contract.

### Implementation follow-up — 7 September 2026

Since this audit, the repository has added a NestJS/Fastify/Drizzle student backend boundary: tenant-scoped student, guardian, and document schema; authenticated lifecycle APIs; capability and audit enforcement; private development file storage; multipart document workflows; and typed frontend adapters with local fallback. The student admission flow now creates server records and uploads required documents for authenticated sessions, while the registry/profile surfaces retain offline recovery behavior.

The audit findings that remain open are material: the workspace has not yet rehearsed the migrations against a real PostgreSQL instance, production object storage and malware scanning are not configured, migration execution currently covers student metadata but not guardian/document-binary reconciliation, and dedicated migration/permission/browser tests are still required. The implementation therefore remains a staged backend transition, not a production cutover.

### Clean-data reset — 8 September 2026

The local environment has been reset for fresh onboarding: browser operational storage is cleared once per client, the student store has no seeded fallback, and the local PostgreSQL database contains zero students, documents, and setup rows. Static chart and illustrative constants still exist in several modules; they are not authoritative records and must be replaced with database-backed empty states as each module is migrated.

A minimum delivery pipeline should run type-checking, lint, unit tests, API authorization tests, migration checks, dependency audit, build, and Playwright smoke tests on every pull request. Production deployment should require a migration review, backup verification, health checks, rollback plan, and post-deploy audit-log verification.

## 6. Backend-stack options

| Option | Strengths | Risks or limitations for EduCore | Recommendation |
|---|---|---|---|
| Supabase-only client-facing backend | Fastest path to Postgres, Auth, Storage, backups, RLS, and dashboards; useful for early delivery [5] | Direct client data access can make complex approval logic, payroll boundaries, idempotency, and service-to-service workflows harder to govern; RLS mistakes are high impact | Good infrastructure option, not the sole application boundary |
| TanStack Start server functions only | Minimal repo disruption and shared TypeScript | Current server entry is SSR plumbing, not a governed backend; domain modules and deployment concerns would become tightly coupled to the frontend | Good transitional adapter, not the long-term domain boundary |
| NestJS + Fastify + PostgreSQL + Drizzle | Strong modular architecture, guards, validation, testing conventions, TypeScript alignment, and explicit application services; Nest supports Express or Fastify [6], while Drizzle offers typed SQL-like access and migrations [7] | More setup than Supabase-only; team must establish conventions and operations | **Recommended application backend** |
| Fastify + TypeScript without Nest | Lean, fast, low abstraction | More architecture must be invented; higher risk of inconsistent modules and authorization patterns in a broad ERP | Viable for a very experienced small team, but less protective here |
| Django + Django REST/GraphQL | Excellent admin and relational domain maturity | Splits the language/tooling model, adds a second ecosystem, and makes shared types with the current frontend less direct | Strong alternative, not the best fit for this repository |
| Microservices from day one | Independent scaling and deployment | Premature operational complexity; cross-domain transactions and audit become harder | Do not choose now |

## 7. Recommended target stack

### Application layer

Use a **modular NestJS application running on Fastify** in a new `apps/api` workspace. Organize modules by business capability: identity, tenancy, people/HR, students/admissions, academics, attendance, assessment, examinations/CBT, finance, communication, reporting, files, audit, and notifications. Each module should expose application services and policies rather than allowing controllers to write tables directly.

NestJS is recommended for architecture, not because EduCore needs microservices. Its module/provider/guard structure gives the team a shared place for authorization, validation, transactions, jobs, and testing. It supports Fastify when the team wants a lean HTTP adapter [6].

### Database

Use **PostgreSQL 16 or later**, hosted as a managed service with point-in-time recovery, encrypted backups, and a staging environment. Use **Drizzle ORM plus SQL migrations** for schema ownership, typed queries, and explicit relational modeling. Drizzle’s SQL-like approach fits the number of joins and reporting queries in this domain [7]. Use UUIDs or ULIDs for public identifiers, database-generated timestamps, unique constraints, foreign keys, check constraints, and version columns.

Every tenant-owned table should have `school_id`; most operational tables should also carry the relevant `academic_session_id` and `term_id`. Use application-level authorization on every service call and PostgreSQL RLS as defense in depth for selected tenant-scoped tables. Do not rely on RLS alone for workflow permissions.

### Auth and authorization

Use an OIDC-compatible identity provider or the platform’s managed OAuth where appropriate, with secure HTTP-only session cookies. Model `users`, `schools`, `school_memberships`, `roles`, `capabilities`, `role_capabilities`, `relationships`, `teacher_assignments`, and `parent_student_links` explicitly. Implement policy functions such as `canViewStudent`, `canEditGradebook`, `canApproveAdmission`, `canPostPayment`, and `canDownloadDocument`, all requiring an authenticated request context.

Use capability-based authorization for sensitive actions instead of broad role strings alone. For example, a bursar may post payments but not approve a fee schedule; a teacher may edit a scoped gradebook but not publish results; a parent may read linked published results but not the global student register.

### Files and asynchronous work

Use private S3-compatible object storage for documents, certificates, receipts, exports, and media. Store only metadata and storage keys in PostgreSQL. Use short-lived presigned URLs issued after authorization. Add a scanning/quarantine state before a document becomes visible.

Use Redis for cache, rate-limit counters, distributed locks where necessary, and a durable job queue such as BullMQ for notifications, export generation, document scanning, reconciliation imports, report generation, and cleanup. Do not use Redis as the source of truth.

### API and contracts

Use REST with OpenAPI or tRPC if the team wants end-to-end TypeScript inference. My recommendation is **REST/OpenAPI at the application boundary** for clearer operational integration, external partners, mobile clients, and future school-device integrations, with generated TypeScript clients for the current frontend. Use Zod or class-validator at the input boundary and explicit DTOs so clients cannot mass-assign protected fields.

### Observability and delivery

Use structured JSON logs, OpenTelemetry traces, error monitoring, database metrics, queue metrics, and security-event alerts. Provide `/health/live` and `/health/ready` endpoints. Use GitHub Actions for checks and deployment, managed Postgres with PITR, object-storage versioning, automated backups, migration review, and a staging environment seeded with synthetic school data.

## 8. Target architecture

```text
React + TanStack Start frontend
  ├─ typed generated API client
  ├─ TanStack Query cache and mutation state
  ├─ offline draft/outbox for selected workflows
  └─ role-specific task shells
          |
          v
NestJS application API on Fastify
  ├─ Auth/session middleware
  ├─ Tenant context
  ├─ Capability and relationship policy engine
  ├─ Domain modules and application services
  ├─ Transaction boundary + idempotency middleware
  ├─ Audit event writer
  ├─ OpenAPI contract
  └─ Job producers
       |             |              |
       v             v              v
PostgreSQL       S3 storage      Redis/BullMQ
(schema/RLS)     (private docs)  (jobs/cache/limits)
       |
       v
Reporting read models / materialized views
```

Keep this as a **modular monolith** until there is evidence that a domain needs independent scaling or deployment. Finance, assessment, and admissions should share a common transaction and audit model first; splitting them prematurely would create consistency problems.

## 9. Prioritized implementation roadmap

### Phase 0 — Stabilize the engineering baseline

Fix lint and formatting incrementally, add strict type-checking, replace or isolate the vulnerable `xlsx` dependency, add CI, create an environment schema, and establish unit/API/browser test conventions. Do not begin broad backend migration without a green baseline.

### Phase 1 — Identity, tenancy, and authorization foundation

Implement real sign-in, school membership, secure sessions, role/capability tables, parent-child links, teacher assignments, tenant context, audit events, and authorization test fixtures. Replace the role picker with a true authenticated identity. Add a policy test matrix covering each role against each sensitive action.

### Phase 2 — Server-backed students and documents

Follow the existing server-backed storage specification. Create student, guardian, enrolment, lifecycle-event, document, and audit tables. Add server-side admission-number uniqueness, document requirements, secure uploads, verification, conflict-safe migration, and read-through fallback. This is the correct first vertical slice because students are the master record consumed by almost every module.

### Phase 3 — Academics, attendance, and teacher scope

Migrate classes, arms, subjects, sessions, terms, teacher assignments, timetable, enrolment, attendance, and absence follow-up. Enforce signed-in teacher scope in the service layer. Add idempotent attendance submission, review, return, approval, and offline reconciliation.

### Phase 4 — Assessment and results

Create relational gradebooks, grade rows, component policies, moderation records, correction requests, publication records, result snapshots, and notification events. Use transactions and immutable publication snapshots. Ensure Practice CBT can never write to official results.

### Phase 5 — Finance hardening

Model fee schedules, versions, invoices, line items, payments, allocations, receipts, adjustments, waivers, reconciliations, reversals, refunds, and approval capabilities. Use idempotency keys and database transactions for payment posting. Add period locks, segregation-of-duties tests, and immutable audit history.

### Phase 6 — CBT and asynchronous operations

Implement question-bank versioning, review, pools, frozen candidate snapshots, authoritative `expiresAt`, autosave with retry-safe request IDs, deterministic delivery, incident records, marking, review, publication, queue workers, and load tests for at least the documented 1,000-candidate target.

### Phase 7 — Reporting, production hardening, and rollout

Build permission-aware reporting read models, backup restoration drills, security headers, rate limits, monitoring, incident response, data retention/deletion tools, privacy notices, support workflows, and a staged migration plan for real schools.

## 10. Definition of production readiness

EduCore should not be described as production-ready until an authorized user can create a record in one session and an authorized second session can retrieve it; an unauthorized user is denied at the API and database layers; a payment or grade publication can be retried without duplication; every sensitive change produces an immutable audit event; a document can be uploaded, scanned, verified, and securely downloaded; a migration can be rehearsed and rolled back; and CI passes type-check, lint, unit, API authorization, browser smoke, dependency, and build checks.

## Final recommendation

Proceed with **PostgreSQL + NestJS/Fastify + Drizzle + private S3-compatible storage + Redis/BullMQ + OIDC/session auth**, while preserving the current React/TanStack Start frontend and migrating one vertical slice at a time. Do not start by converting all 20 local stores simultaneously. Start with identity/tenancy, then students/documents, then teacher scope and academics. That sequence closes the highest-risk security gap while creating the master records needed by every later module.

### References

[1]: https://owasp.org/API-Security/editions/2023/en/0x11-t10/ "OWASP Top 10 API Security Risks – 2023"
[2]: https://www.postgresql.org/docs/current/ddl-rowsecurity.html "PostgreSQL Row Security Policies"
[3]: https://www.postgresql.org/docs/current/transaction-iso.html "PostgreSQL Transaction Isolation"
[4]: https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html "OWASP File Upload Cheat Sheet"
[5]: https://supabase.com/docs/guides/database/overview "Supabase Database Documentation"
[6]: https://docs.nestjs.com/ "NestJS Documentation"
[7]: https://orm.drizzle.team/docs/overview "Drizzle ORM Documentation"
