# Primary Class Teacher Access and Recording

> **Status authority:** This document contains teacher workflow requirements and design detail only. Use [BACKEND-IMPLEMENTATION-STATUS.md](./BACKEND-IMPLEMENTATION-STATUS.md) for authoritative backend phase and slice status.

## Purpose

## Implementation update - 2026-09-08

- Fresh onboarding no longer seeds demo staff into the approval hierarchy.
- School setup now supports editable academic sessions and terms, class-arm rows, school-type-aware grading defaults, removable/editable grade rows, and CA1 + CA2 + Assignment + Exam weighting that must total 100%.
- Governance approval owners are deferred until verified onboarded staff exist.
- The API now provides authoritative academic sessions, terms, classes, arms, subjects, teacher assignments, and authenticated scope resolution at `GET /api/academics/me/scope`.
- Assignment administration now supports tenant-checked create/list/soft-close operations, effective dates, overlap rejection, capability checks, and audit events. Migrations `0007_academic_scope`, `0008_academic_assignment_history`, and `0009_academic_assignment_capabilities` are applied. Scoped student registers remain planned follow-up work.
- Student register list/detail queries now enforce active teacher class/subject assignment scope in SQL, including effective dates. Administrators and principals retain school-wide access, and student document lookups reuse the same scope check. Parent/student relationship scope remains separate.
- Attendance is now verified complete for this slice: UUID-backed class/arm/session/term references, teacher-scoped reads/writes, draft/submitted/returned/approved states, audited absence/lateness exceptions, contacted/resolved follow-up, and the focused live attendance workflow test are implemented. Offline reconciliation remains planned.
- Academic structure CRUD is now server-backed for sessions, terms, classes, arms, and subjects, with administrator/principal capability checks, parent validation, safe deletion checks, and audit events.
- Attendance retries now accept an optional tenant-scoped `Idempotency-Key`; identical retries return the original register and conflicting payload reuse returns `409`. This is request-level retry safety only; offline outbox and reconciliation remain planned.

A primary-school class teacher should have access to the specific class arm assigned to them and should be able to record approved class records for only those pupils. The teacher must not see or edit unrelated classes.

## Form and workflow standard

All substantial workflows must use a guided multi-step form. This is the standard for every form already created and every form added in future phases.

### Use multi-step forms for

- Teacher and non-teaching staff onboarding
- Student admission and document collection
- Class, subject, curriculum, timetable, and enrolment setup
- Class-teacher and subject-teacher assignment
- Lesson-plan creation and review
- CBT question creation, exam configuration, candidate registration, and result publication
- Leave, employment, certificate, payroll, and approval workflows
- Any action that collects more than one related field or has a review/approval stage

### Single-step forms are allowed only for

- One-field quick actions, such as changing a status after confirmation
- A simple search or filter
- A short atomic action that does not create an approval-bound record

If a single-step dialog collects multiple fields, uploads documents, changes ownership, or creates a record, it must be converted to a multi-step form before that slice is marked complete.

### Required multi-step behavior

- Clear progress indicator and named steps
- Back and Next controls without losing entered data
- Required-field validation before advancing
- Save draft/continue later for longer workflows
- Review step before final submission
- Confirmation showing the new record ID and next owner/status
- Empty, error, restricted, and recovery states

### Existing flows to convert

- People staff profile updates currently use prompts and should become a small multi-step profile form.
- Academic class, subject, calendar, and assignment creation currently use prompts or inline controls and should become guided forms when they collect multiple fields.
- Student transfer, withdrawal, and guardian updates should use reviewed forms instead of browser prompts.
- Finance follow-up, adjustment, invoice, and payment workflows should remain guided forms with review/confirmation where they change records.
- Assessment correction, CBT configuration, and examination creation should use guided forms rather than prompt-only actions.

## CBT, student portal, and teacher dashboard audit

The current CBT experience is a prototype and should not yet be treated as an official examination engine. Timing, proctoring, question-bank delivery, and attempt persistence must be implemented before school CBT results are considered authoritative.

## HR dashboard audit

The HR dashboard should be a small action-oriented work queue, not only a staff count. It should help HR answer: who is onboarding, who is verified, who is absent or on leave, which documents or contracts need attention, and which staff changes require approval.

### Current HR gaps

- Staff records do not yet have a complete detail view for identity, employment, qualifications, documents, assignments, leave, attendance, and audit history.
- Onboarding supports a guided form, but certificate files are currently stored as local metadata and lack verification, rejection, expiry, replacement, and secure download workflows.
- Employment status has no effective-dated history for probation, confirmation, promotion, suspension reasons, contract renewal, exit, or rehire.
- Leave is represented by a status only; there are no leave requests, balances, dates, approval, handover, or return-to-work records.
- Staff attendance has no HR period lock, correction approval, holiday/calendar policy, overtime, or payroll-ready export.
- Staff changes and payroll changes need shared audit events with actor, reason, timestamp, and before/after values.
- Salary, bank, tax, and pension data need a separate HR/payroll permission boundary; directory users must never receive those fields.
- HR needs a queue for pending onboarding, missing documents, expiring certificates/contracts, leave decisions, attendance exceptions, and unassigned eligible teachers.
- HR permissions and approval rules need explicit HR, payroll, leave, documents, and staff-assignment capabilities.
- Newly onboarded staff must flow into attendance, People search, assignment eligibility, communication, and workforce reporting without copying records.

### Simple HR dashboard layout

Keep the dashboard to four areas:

1. **Today:** staff on duty, absent, late, on leave, and urgent exceptions.
2. **Action queue:** onboarding verification, missing documents, contract/certificate expiry, leave requests, and pending approvals.
3. **People:** searchable staff directory with teaching/non-teaching, department, status, and employment filters.
4. **Links:** staff profile, assignments, attendance, leave, restricted payroll, reports, and audit history.

### HR record flow

```text
HR creates staff profile
  -> employment and qualification verification
    -> documents/certificates verified
      -> staff becomes Active and eligible for assignment
        -> People/Academics assign class or subject responsibilities
          -> Attendance records staff operations
            -> HR reviews leave and attendance exceptions
              -> authorized payroll uses approved HR data
```

Payroll must consume approved HR records but must not change teaching assignments. A staff status change should disable new operational access when appropriate while preserving historical records.

### HR release priorities

- **Must have:** searchable staff directory, staff detail view, lifecycle history, document verification, leave requests, attendance exceptions, permissions, audit events, and server-backed storage.
- **Later:** payslips, automated payroll calculation, benefits, recruitment, performance appraisal, training, disciplinary cases, and biometric integrations.

## Student and teacher dashboard workflow audit

The dashboard surfaces are visually usable, but several screen-to-screen handoffs are not yet safe or complete. The next work should prioritize correct scope and reliable transitions over adding more cards or menus.

### Critical workflow gaps

- Student profile edit, guardian, and withdrawal actions need role checks so students, parents, and teachers cannot mutate records.
- Teacher class and subject access must resolve against the signed-in teacher ID; a matching assignment belonging to another teacher must not grant access.
- Student assignment submissions must include the student ID so accounts cannot overwrite or read another student's work on the same device.
- Parent and student navigation must not expose blocked global student registers or administrative screens. They need dedicated `My learning` and `My child` paths.
- Parent access to Assessment, Examinations, Communication, and Finance must be limited to permitted published or linked records; management actions must be hidden and blocked.

### High-priority handoff gaps

- Teacher dashboard needs actionable links for assigned timetable, attendance, lesson plans, gradebooks, returned corrections, CBT tasks, and messages.
- Student dashboard needs today's timetable, assignments, CBT sessions, published results, attendance, fees, announcements, and submission status.
- Assessment publication must hand off to the student result/report-card view and notification flow.
- Attendance submission must surface its next state, reviewer, correction reason, and approval result.
- Examination actions must persist configurations and link candidates, CBT attempts, marking, and publication instead of ending in toast messages.
- Admission, transfer, promotion, and withdrawal must hand off consistently to class enrolment, attendance, gradebook, timetable, and examination eligibility.
- Empty, loading, error, restricted, offline, and retry states need consistent treatment on both dashboards.

### Data integrity gaps

- Store-level mutations need actor, role, record scope, and lifecycle validation instead of relying only on UI visibility.
- Every student and teacher data key must include the correct student, teacher, school, session, and term scope.
- Reports must use approved operational records rather than static seed values or unfiltered cross-term data.
- Profile menu actions such as `My profile` must resolve to real pages or be removed until implemented.

### Simple screen-to-screen journeys

```text
Student: Dashboard -> My learning -> Assignment/CBT -> Submit -> Submission status
Student: Dashboard -> Results -> Published result/report card
Student: Dashboard -> Attendance / Fees / Messages

Parent: Dashboard -> Child selector -> Child overview -> Attendance / Results / Fees / Messages

Teacher: Dashboard -> Assigned class/subject -> Attendance / Lesson plan / Gradebook -> Submit -> Review status

Administrator: Dashboard -> Approval queue -> Student / Attendance / Results / Finance review -> Approve or return -> Notification
```

No role should be sent to a page it cannot use. Every action should finish with a visible next state, owner, and timestamp.

### Recommended dashboard delivery slices

- **Slice D.1 - Role-safe navigation and blocked-route cleanup:** separate student, parent, teacher, and administrative navigation and remove dead links.
- **Slice D.2 - Server/domain scope enforcement:** enforce student, parent-child, teacher-class, teacher-subject, school, session, and term scope in stores/API.
- **Slice D.3 - Student dashboard workflow:** connect learning, submissions, CBT, published results, attendance, fees, messages, and status states.
- **Slice D.4 - Teacher dashboard workflow:** connect assigned classes/subjects, timetable, attendance, lesson plans, gradebooks, CBT tasks, corrections, and messages.
- **Slice D.5 - Cross-module handoffs:** connect admissions, enrolment, attendance, assessment publication, report cards, finance, and notifications.
- **Slice D.6 - Lifecycle, offline, and audit hardening:** add state transitions, retry/conflict handling, actor audit, and consistent empty/error/offline states.
- **Slice D.7 - Multi-step form consistency:** convert remaining multi-field prompts and dialogs into guided forms and standardize progress, draft, validation, review, and confirmation states.

### Dashboard audit acceptance checks

- [ ] A student cannot view or mutate another student's submissions or profile.
- [ ] A parent can switch only between linked children and cannot access global registers.
- [ ] A teacher sees only their own assigned classes and subjects in every dashboard and workflow.
- [ ] Each dashboard action navigates to a real usable page and exposes its next status.
- [ ] Published results appear in the correct student/parent result view.
- [ ] Submitted attendance, gradebooks, lesson plans, admissions, and exams show reviewer and lifecycle status.
- [ ] Cross-module changes preserve student, teacher, class, session, and term identity.
- [ ] Dashboard empty, loading, error, restricted, offline, and retry states are present.
- [ ] Every multi-field workflow uses the shared multi-step form standard.

### CBT gaps to close

- Exam duration is not yet enforced by an authoritative countdown and expiry timestamp.
- Tab switching, window blur, fullscreen exit, reconnects, and suspicious activity are not yet recorded as proctoring incidents.
- Attempts store final results locally instead of durable per-question responses and server-side state.
- School CBT and Practice CBT currently need separate question pools and result policies.
- The question bank needs review, approval, tagging, versioning, import/export, and controlled publication.
- Candidate registration needs an explicit frozen student/class snapshot rather than title or level matching.
- A large sitting needs idempotent autosave, retry handling, concurrency protection, and monitoring for at least 1,000 candidates.

### Student portal gaps to close

- Provide a dedicated student home with today's timetable, active tasks, announcements, attendance summary, and upcoming CBT sessions.
- Show only the student's linked and published results, assignments, materials, invoices/receipts permitted by policy, and profile data.
- Add exam instructions, active-attempt recovery, submission status, result history, and connectivity feedback.
- Keep Practice CBT scores separate from official School CBT results.
- Add a clear restricted, empty, loading, and offline state for each student area.

### Teacher dashboard gaps to close

- Resolve class and subject access using the signed-in teacher ID, not merely whether another teacher has a matching assignment.
- Show today's assigned timetable, class register tasks, lesson plans, gradebooks awaiting work, returned corrections, CBT tasks, and messages.
- Link class-teacher and subject-teacher workspaces without merging their permissions.
- Add lesson-plan access for weekly, term, and session planning across primary and secondary classes.
- Add a clear no-assignment state and prevent access through changed URLs or query parameters.
- Provide teacher-facing submission, review status, and audit history without exposing HR salary data.

## Simple CBT operating model

Keep the CBT flow short and predictable:

1. Question author creates questions in the question bank.
2. Reviewer approves questions and assigns subject, class/level, topic, difficulty, marks, and version.
3. Examination officer creates a School CBT or Practice CBT using an approved question pool.
4. Officer sets duration, availability window, question count, attempt limit, marks, instructions, and integrity policy.
5. Officer selects explicit classes or students and freezes the candidate snapshot.
6. The server creates an attempt with a unique seed and authoritative `expiresAt` for each candidate.
7. Each candidate receives a deterministic but different question order and option order from the same approved pool.
8. Answers autosave by attempt and question with retry-safe request IDs.
9. Expiry automatically submits and locks the attempt; manual submission does the same.
10. Objective items are marked automatically, incidents are reviewed, and only approved School CBT results enter official results.

### Question bank to CBT flow

```text
Question bank
  -> draft question
    -> academic/examination review
      -> approved, versioned question
        -> School CBT pool or Practice CBT pool
          -> candidate snapshot and unique seed
            -> individualized attempt delivery
              -> autosaved responses and proctoring events
                -> marking, review, and publication policy
```

School CBT and Practice CBT may reuse an approved question, but they must select from separate exam configurations and produce separate attempt/result records. A Practice CBT score must never overwrite or publish into the official examination result.

### Question bank record

- `id`, `version`, `status`, `subjectCode`, `classLevel`, `section`, `topic`, and `difficulty`.
- Question type, prompt, options, correct answer, marks, explanation, language, and media reference.
- Author, reviewer, approval date, retirement date, and audit history.
- Pool eligibility for School CBT, Practice CBT, or both.

### CBT attempt and proctoring record

- Attempt ID, exam ID, candidate ID, session, term, started time, `expiresAt`, submitted time, status, and unique seed.
- Ordered question IDs, option order, question versions, responses, autosave timestamps, score, and review status.
- Incident type, timestamp, duration, severity, browser/device context, and reviewer decision.

### Lightweight proctoring policy

- Request fullscreen before starting and show a clear warning when fullscreen is exited.
- Record tab visibility changes, window blur/focus, disconnect/reconnect, and repeated refresh events.
- Allow a small configurable warning threshold, then lock or submit only when the examination policy requires it.
- Do not require camera or microphone capture by default; make stronger identity checks an optional future policy.
- Treat proctoring signals as review evidence, not automatic proof of misconduct.

## Phase and slice tracking

Work is delivered in small slices. A slice is marked `[x]` only after its implementation, focused validation, commit, and push are complete. A phase is marked complete only when every slice in that phase is complete.

| Status | Meaning |
| --- | --- |
| `[ ]` | Planned or in progress |
| `[x]` | Implemented, validated, committed, and pushed |

Current progress: **student lifecycle, academic scope, assignment administration, scoped student registers, and attendance foundation complete**. Impact Breed School has also been approved in the local platform workflow. The next active work remains the attendance follow-up and offline/reconciliation slices; remaining dashboard, parent/student relationship, and HR slices are still planned until implemented and validated.

## Master delivery sequence

Implement the work in this order. Only the current open slice should be worked on; after validation and push, mark that slice `[x]` and move to the next one.

### Slice completion rule

For every slice:

1. Implement the smallest usable workflow.
2. Validate the touched behavior with focused checks and a build.
3. Test the relevant screen-to-screen flow locally where a browser workflow exists.
4. Update this tracker and the detailed checklist.
5. Commit and push to `origin/main`.

Do not mark a whole phase complete while any slice inside it remains `[ ]`.

### Phase 0 - Foundation records

- [x] **Slice 0.1 - Teacher and non-teaching staff onboarding form**
- [ ] **Slice 0.2 - Classes, arms, subjects, curriculum, timetable, and enrolment**
- [ ] **Slice 0.3 - Staff verification and assignment eligibility**
- [ ] **Slice 0.4 - HR lifecycle, leave, documents, and payroll boundary**

### Phase 1 - Class-teacher assignment foundation

- [x] **Slice 1.1 - Assignment data model and persistence**
- [x] **Slice 1.2 - Session, term, class-arm, and active-state scope**
- [x] **Slice 1.3 - Overlap validation and assignment history**

### Phase 2 - Assignment administration

- [x] **Slice 2.1 - Administrator/principal assignment controls**
- [x] **Slice 2.2 - Assignment mutation permission enforcement**
- [x] **Slice 2.3 - People-owned assignment administration and Academics summaries**

### Phase 3 - Teacher scope and dashboard

- [ ] **Slice 3.1 - Signed-in teacher class and subject scope resolver**
- [ ] **Slice 3.2 - Assigned class/subject dashboard and restricted states**
- [ ] **Slice 3.3 - URL/query protection and scoped student registers**

### Phase 4 - Lesson planning and class records

- [ ] **Slice 4.1 - Weekly, term, and session lesson-plan records**
- [ ] **Slice 4.2 - Subject, curriculum, scheme-of-work, and class links**
- [ ] **Slice 4.3 - Primary and secondary teacher lesson-plan workspace**
- [ ] **Slice 4.4 - Attendance, class notes, and class-record drafts**

### Phase 5 - CBT question bank and configuration

- [ ] **Slice 5.1 - Question bank records, tags, versions, and review**
- [ ] **Slice 5.2 - Separate School CBT and Practice CBT pools**
- [ ] **Slice 5.3 - Exam configuration and frozen candidate snapshot**

### Phase 6 - CBT delivery and proctoring

- [ ] **Slice 6.1 - Authoritative timing, expiry, autosave, and recovery**
- [ ] **Slice 6.2 - Seeded individualized questions and option order**
- [ ] **Slice 6.3 - Fullscreen, tab-switch, reconnect, and incident logging**
- [ ] **Slice 6.4 - Concurrent sitting support for 1,000 candidates**

### Phase 7 - Student portal

- [ ] **Slice 7.1 - Student home and today's learning view**
- [ ] **Slice 7.2 - Published results, assignments, materials, and announcements**
- [ ] **Slice 7.3 - CBT instructions, attempt recovery, and submission status**
- [ ] **Slice 7.4 - Student visibility, restricted states, and offline feedback**

### Phase 8 - Review, results, and release

- [ ] **Slice 8.1 - Teacher and class-record review lifecycle**
- [ ] **Slice 8.2 - CBT marking, exception review, and result publication**
- [ ] **Slice 8.3 - Audit history and approved-record locking**
- [ ] **Slice 8.4 - Permission, browser, concurrency, build, commit, and push validation**

### Phase HR - HR dashboard and workforce operations

- [ ] **Slice HR.1 - Staff directory, profile detail, search, and status filters**
- [ ] **Slice HR.2 - Onboarding verification queue and certificate/document lifecycle**
- [ ] **Slice HR.3 - Employment lifecycle, contracts, leave, and return-to-work**
- [ ] **Slice HR.4 - Staff attendance periods, corrections, exceptions, and export**
- [ ] **Slice HR.5 - HR/payroll permissions, approvals, audit, and server boundary**
- [ ] **Slice HR.6 - Assignment readiness, workforce reports, notifications, and empty states**

## Current execution state

- **Completed:** Slice 0.1, Slice 1.1, Slice 1.2, Slice 1.3, Slice 2.1, and Slice 2.2.
- **Next:** Slice 3.1 - Signed-in teacher class and subject scope resolver.
- **Blocked by the next slice:** Phase 3 completion, then Phase 4 Slice 4.1.
- **Not started:** Phase 0 remaining setup slices, Phases 3-8, and all HR slices beyond onboarding.

When a slice is completed, update both its master-sequence checkbox and its detailed phase checkbox in this file during the same commit.

## Module ownership and separation

These workflows must remain separate in the product navigation and in the data model:

| Area | Owns | Does not own |
| --- | --- | --- |
| People | Staff profiles, teacher roles, class-teacher assignments, and staff access | Class definitions, subjects, curriculum, or marks |
| Academics | Class and arm creation, subject creation, curriculum, timetable, and subject-teacher assignments | Admission records, payment records, or assessment approval |
| Class teacher workspace | Assigned primary class register, attendance, class notes, and permitted class records | Assigning teachers, creating classes, publishing results, or approving records |
| Assessment | Gradebook entry, component scores, moderation, examinations, and result publication | General staff assignment and class-arm administration |

### Assignment separation

- **Class-teacher assignment:** one teacher is responsible for the day-to-day operation of a specific class arm, such as Primary 4A.
- **Subject-teacher assignment:** a teacher is permitted to teach or enter a specific subject for a specific class arm, such as Mathematics for Primary 4A.
- A class-teacher assignment must not automatically grant subject gradebook access.
- A subject-teacher assignment must not automatically grant full class-register ownership.
- Both assignments may exist for the same teacher, but they are created, reviewed, and revoked independently.

### Academic setup dependencies

Before assigning a primary class teacher, administrators must be able to create and maintain:

- Class levels and class arms, including section, capacity, room, and active session.
- Subjects, including code, name, department, levels, core/elective status, and weekly periods.
- Curriculum and scheme-of-work records, including subject ownership, coverage, and session/term scope.
- Timetable slots and class enrolment links.

These setup records belong in the Academics module. The People module selects existing staff for assignments; the Assessment module consumes the assignments when controlling gradebook access.

## Teacher onboarding and connected records

Teacher onboarding is a staff lifecycle, not an Assessment workflow. A teacher must be onboarded once, then linked to academic responsibilities through separate approvals.

### Ownership by record

| Record | Owner | Used by |
| --- | --- | --- |
| Staff identity and contact record | People / HR | Roles, communication, attendance, assignments |
| Employment record and contract | HR | Employment status, start/end dates, leave, compliance |
| Salary, allowances, deductions, and payroll history | HR / Finance payroll | Payroll processing and financial reporting; never exposed in teacher views |
| Teacher qualification and subject capability | HR with Academic review | Eligible subject and class assignments |
| Class-teacher assignment | People / Academics administration | Class workspace, attendance, class records |
| Subject-teacher assignment | Academics administration | Subject timetable and gradebook access |
| Attendance and lateness | Attendance / HR | Staff attendance, payroll exceptions, management reports |
| Gradebook and assessment records | Assessment | Moderation, results, report cards |
| Class notes and welfare records | Class teacher workspace | Reviewers and permitted pastoral workflows |

### Onboarding flow

```text
HR creates employee record
  -> People creates or links staff profile and teacher role
    -> HR verifies contract, qualifications, and employment status
      -> Academics creates classes, subjects, curriculum, and timetable
        -> People/Academics assigns class teacher or subject teacher
          -> Attendance, class workspace, and Assessment resolve approved assignments
            -> HR/Finance records staff attendance and payroll separately
```

### Teacher onboarding records

Capture the following before a teacher can receive an active assignment:

- Stable `teacherId`/staff ID, legal name, contact details, address, and emergency contact.
- Employment type, department, job title, contract start date, contract end date, and active status.
- Qualification, certification, subjects qualified to teach, and verification status.
- Bank and payroll details in a restricted HR/Finance area with audit history.
- Salary structure, allowances, deductions, payroll frequency, effective date, and approval status.
- Role, school access, and approval capability. A login role alone must not grant class or subject access.
- Optional profile photo and required employment documents with verification status.

### Onboarding states

- `Draft`: HR is preparing the staff record.
- `Pending verification`: identity, employment, or qualification documents require review.
- `Active`: the teacher can be selected for approved assignments.
- `On leave`: staff record remains active, but new operational access may be temporarily restricted.
- `Suspended`: access and assignments are disabled while history is retained.
- `Exited`: no new access; historical attendance, payroll, assignments, and academic records remain auditable.

Salary or payroll changes must never silently change a teacher's class or subject assignments. Assignment changes must be separately approved and audited.

## Phase 0 - People, HR, and academic setup prerequisites

### Phase 0 slices

- [x] **Slice 0.1 - Teacher and non-teaching staff onboarding form**
- [ ] **Slice 0.2 - Academic setup: classes, subjects, curriculum, timetable, and enrolment**
- [ ] **Slice 0.3 - Staff verification and assignment eligibility**

### People setup

- [x] Staff profile exists with a stable teacher ID and active employment status.
- [x] Teacher role and school access are defined before assignment.
- [x] People records expose eligible primary teachers to the assignment workflow.

### HR setup

- [x] HR can onboard a teacher with employment, qualification, and required-document records.
- [ ] HR can record salary, allowances, deductions, payroll effective dates, and approval history in a restricted area.
- [ ] HR status changes control eligibility for new assignments without deleting historical records.
- [ ] Teacher attendance can be linked to HR/payroll exceptions without exposing salary data to class teachers.

### Academic setup

- [ ] Administrator can create and edit class levels and class arms.
- [ ] Administrator can create and edit subjects and subject metadata.
- [ ] Administrator can create curriculum and scheme-of-work records by subject, session, and term.
- [ ] Administrator can configure timetable slots and enrol pupils into class arms.
- [ ] Class, subject, curriculum, timetable, and enrolment records have independent audit history.

### Phase 0 check

- [ ] A teacher cannot be assigned until the staff record is active and required verification is complete.
- [ ] Salary and payroll data are visible only to authorized HR/Finance roles.
- [ ] A teacher's HR status, academic assignments, attendance, and assessment records remain separate linked records.
- [ ] A class arm can be created before a class teacher is assigned.
- [ ] A subject can be created and assigned to a class independently of the class teacher.
- [ ] Curriculum ownership can be configured without granting gradebook entry permission.
- [ ] A teacher assignment cannot target a missing, inactive, or non-primary class arm.

## Phase 0B - Question bank and CBT prerequisites

### Phase 0B slices

- [ ] **Slice 0B.1 - Question bank records, tagging, versioning, and review**
- [ ] **Slice 0B.2 - Separate School CBT and Practice CBT pool policies**
- [ ] **Slice 0B.3 - Exam configuration and frozen candidate snapshot**

### Phase 0B check

- [ ] Only approved, versioned questions can feed a live exam.
- [ ] An exam configuration identifies mode, pool, subject, class scope, duration, marks, and attempt limit.
- [ ] Candidate membership remains fixed for the sitting after the exam starts.

## Phase 1 - Assignment foundation

### Phase 1 slices

- [x] **Slice 1.1 - Class-teacher assignment data model and persistence**
- [x] **Slice 1.2 - Session, term, class-arm, and active-state scope**
- [x] **Slice 1.3 - Overlapping assignment validation and assignment history**

### Assignment model

Add a dedicated class-teacher assignment to each class arm:

- `classId`
- `teacherId`
- `teacherName`
- `section: Primary`
- `session`
- `effectiveFrom`
- `effectiveTo` (optional)
- `active`
- `assignedBy`
- `assignedAt`

A class teacher assignment is different from a subject-teacher assignment. A primary class teacher owns the day-to-day class register, while subject assignments control subject gradebook access.

### Phase 1 deliverables

- [x] Add the class-teacher assignment type and persistence boundary.
- [x] Add session, term, class-arm, active-state, and effective-date handling.
- [x] Keep class-teacher assignments separate from subject-teacher assignments.
- [x] Prevent overlapping active primary class-teacher assignments unless explicitly allowed by policy.

### Phase 1 check

- [x] An administrator can create, update, deactivate, and view a primary class-teacher assignment.
- [x] An assignment remains correctly scoped after refresh and session/term changes.

## Phase 2 - Assignment administration and permissions

### Phase 2 slices

- [x] **Slice 2.1 - Administrator/principal assignment controls**
- [x] **Slice 2.2 - Assignment mutation permission enforcement**
- [ ] **Slice 2.3 - People-owned assignment administration with Academics summaries**

### Access rules

### Primary class teacher can

- View the assigned primary class and class arm
- View only pupils enrolled in that class arm
- Record and edit daily attendance before submission
- Record lateness and absence reasons
- Record class notes, behaviour observations, and welfare follow-ups
- View the class timetable, subjects, and assigned subject teachers
- Enter assessment components only where a matching subject assignment exists
- Submit the class attendance or class record for review
- View returned records and correct them when a reviewer requests changes
- View the audit history for records they created or submitted

### Primary class teacher cannot

- View pupils from another class unless separately assigned
- Change class membership, transfer, withdrawal, or admission status
- Approve their own attendance or class records
- Publish results or approve gradebooks
- Edit another teacher's subject gradebook without an explicit assignment
- View finance records beyond the minimum student status needed by an approved school workflow
- Access confidential guardian, safeguarding, or disciplinary information without permission

Administrators and principals retain full class visibility and may assign, replace, deactivate, approve, or return class-teacher assignments.

### Phase 2 deliverables

- [x] Add assignment management UI for administrators and principals; final ownership belongs under People, with assignment summaries visible in Academics.
- [x] Add role and capability checks to every assignment mutation.
- [x] Show the assigned teacher, primary class arm, session, term, and active status.
- [x] Prevent teachers from assigning themselves or changing class membership.
- [x] Move the full assignment administration workflow into People, with Academics retaining class/subject setup and read-only assignment summaries.

### Phase 2 check

- [x] Administrators and principals can manage assignments.
- [x] Teachers cannot create or alter assignments.
- [x] A teacher without an assignment receives a restricted state rather than a full student list.

## Phase 3 - Teacher class scope

### Phase 3 slices

- [ ] **Slice 3.1 - Teacher class-scope resolver**
- [ ] **Slice 3.2 - Assigned class dashboard and restricted states**
- [ ] **Slice 3.3 - URL, query, session, term, and enrolment scope enforcement**

### Class scope resolution

Resolve the teacher's visible class scope from active assignments for the current session and term. Every student, attendance, assessment, and class-record query must apply this scope in the domain store, not only in the UI.

```text
current user
  -> active class-teacher assignments
      -> assigned primary class arms
          -> enrolled pupils and permitted class records
```

If a teacher has no active primary class assignment, show a restricted empty state with the action to contact an administrator. Do not fall back to showing all pupils.

### Phase 3 deliverables

- Resolve active class scope for the signed-in teacher and current session/term.
- Filter dashboard cards, class selectors, student registers, and class routes by that scope.
- Enforce class-arm checks in the domain store and server/API boundary, not only in the UI.
- Preserve historical access to records the teacher created without exposing unrelated current pupils.

### Phase 3 check

- A teacher assigned to Primary 4A cannot access Primary 4B by changing a URL, query, or class ID.
- A teacher with two explicit assignments can access both assigned class arms.
- The register contains only currently enrolled pupils in the selected assigned class.

## Phase 4 - Lesson planning and class recording

### Phase 4 slices

- [ ] **Slice 4.1 - Weekly, term, and session lesson-plan records**
- [ ] **Slice 4.2 - Subject, curriculum, scheme-of-work, and class links**
- [ ] **Slice 4.3 - Primary and secondary teacher lesson-plan workspace**
- [ ] **Slice 4.4 - Scoped class register and class recording**

### Lesson plan ownership

Lesson plans belong to the teacher's approved teaching assignment, not directly to the login role:

- A **class teacher** can create class plans for the assigned primary class arm and the subjects they are authorized to teach.
- A **subject teacher** can create plans for each assigned subject and class arm across primary and secondary sections.
- A teacher cannot create a plan for an unassigned class, subject, session, or term.
- Lesson plans are separate from gradebook marks. Creating a lesson plan does not grant permission to enter or approve results.

### Lesson plan record

Each plan should include:

- `id`, `teacherId`, `classId`, `subjectCode`, `session`, and `term`.
- Planning period: `Week`, `Term`, or `Session`.
- Week number or date range, topic, learning objectives, lesson activities, resources, differentiation, and assessment approach.
- Status: `Draft`, `Submitted`, `Reviewed`, `Returned`, or `Archived`.
- Created/updated timestamps, reviewer, review note, and audit history.

### Lesson planning workflow

1. Teacher chooses the session and term.
2. Teacher chooses an assigned class arm and subject.
3. Teacher chooses a week or creates a term/session overview.
4. The app loads the curriculum and scheme-of-work context for that subject and class.
5. Teacher writes or edits objectives, activities, resources, differentiation, and assessment notes.
6. Teacher saves a draft and can copy a plan to another valid week or assigned class.
7. Teacher submits the plan for academic review.
8. Academic coordinator, principal, or administrator reviews it, returns it with a note, or marks it reviewed.
9. Reviewed plans remain available to the teacher and authorized academic leadership as read-only history unless returned.

### Primary and secondary coverage

The same lesson-plan workflow applies to Nursery, Primary, Junior Secondary, and Senior Secondary classes, while validation remains section-aware:

- Primary plans may be class-led or subject-led depending on the school's timetable and assignment.
- Secondary plans are normally subject-led and must match the subject-teacher assignment.
- A class teacher may plan multiple subjects only when each subject is explicitly assigned or the school policy grants the class-teacher scope.
- Curriculum, scheme-of-work, timetable, and lesson plans must share the same session and term context.

### Lesson planning UI

- Teacher dashboard: `My classes`, `My subjects`, and `Lesson plans`.
- Filters for session, term, class, subject, week, and status.
- Week view for daily lessons and term/session view for broad coverage.
- Curriculum and scheme-of-work reference beside the editor.
- Save draft, duplicate, submit, return note, and review history actions.
- Restricted empty state when no eligible class or subject assignment exists.

### Lesson planning functions

- `getTeacherLessonPlanScope(teacherId, session, term)`
- `canCreateLessonPlan(teacherId, classId, subjectCode, session, term)`
- `getLessonPlans(filters)`
- `saveLessonPlan(plan, actor)`
- `submitLessonPlan(planId, actor)`
- `returnLessonPlan(planId, actor, reason)`
- `reviewLessonPlan(planId, actor)`

### Recording workflow

1. Teacher opens the primary class workspace.
2. The system shows only active assigned class arms.
3. Teacher selects a date or current session/term record.
4. The system loads only pupils enrolled in that class arm.
5. Teacher records attendance, lateness, notes, or permitted assessment values.
6. Draft changes remain editable by the teacher.
7. Teacher submits the record for review.
8. Principal or administrator approves it or returns it with a correction reason.
9. Approved records become read-only to the teacher.
10. Every create, edit, submit, return, approve, and correction action is audited.

### Phase 4 deliverables

- Add lesson-plan records scoped to teacher, class, subject, session, term, week, and status.
- Add weekly, term, and session planning views for primary and secondary classes.
- Add curriculum and scheme-of-work context to the lesson-plan editor.
- Add lesson-plan draft, submit, return, review, and archive lifecycle.
- Add the scoped primary class workspace and class register.
- Add attendance, lateness, absence reason, class note, behaviour, and welfare recording.
- Add draft persistence and safe retry behavior.
- Apply effective dates so transferred or withdrawn pupils leave the active register at the correct time.
- Require a matching subject assignment before entering subject gradebook values.

### Phase 4 check

- A class teacher can create a weekly plan for an assigned primary class and permitted subject.
- A subject teacher can create plans for each assigned subject and class in primary or secondary school.
- A teacher cannot create a lesson plan for an unassigned class or subject.
- Weekly plans connect to the correct term, session, curriculum, and scheme of work.
- Term and session overviews remain separate from weekly lesson records.
- Lesson-plan edits and review decisions are audited.
- The teacher can save a draft and resume it later.
- The teacher can record only pupils in the assigned class arm.
- The teacher cannot edit finance, admission, transfer, withdrawal, or restricted guardian data.

## Phase 4B - CBT delivery and proctoring

### Phase 4B slices

- [ ] **Slice 4B.1 - Authoritative timing, expiry, autosave, and recovery**
- [ ] **Slice 4B.2 - Seeded individualized question and option delivery**
- [ ] **Slice 4B.3 - Fullscreen, tab-switch, reconnect, and incident logging**
- [ ] **Slice 4B.4 - Concurrent sitting support for 1,000 candidates**

### Phase 4B check

- [ ] Every candidate receives a server-authoritative expiry time.
- [ ] Two candidates taking the same exam receive different deterministic question/option orders while drawing from the same approved pool.
- [ ] Refresh and reconnect recover the same attempt without creating a duplicate attempt.
- [ ] Expiry submits and locks the attempt even if the browser is closed.
- [ ] Proctoring incidents are visible to an examination reviewer.
- [ ] Practice CBT attempts never enter official School CBT results.

## Phase 4C - Student portal

### Phase 4C slices

- [ ] **Slice 4C.1 - Student home and today's learning view**
- [ ] **Slice 4C.2 - Published results, assignments, materials, and announcements**
- [ ] **Slice 4C.3 - CBT instructions, active attempt recovery, and submission status**
- [ ] **Slice 4C.4 - Student visibility, restricted states, and offline feedback**

### Phase 4C check

- [ ] Students see only their own linked records and published results.
- [ ] Students can resume an active attempt without changing candidate identity or expiry.
- [ ] Practice scores and official scores are visibly separated.
- [ ] Empty, restricted, loading, error, and offline states are understandable without exposing other students.

## Phase 4D - Teacher dashboard and assignment scope

### Phase 4D slices

- [ ] **Slice 4D.1 - Signed-in teacher ID and assignment resolver**
- [ ] **Slice 4D.2 - Assigned class/subject dashboard and restricted states**
- [ ] **Slice 4D.3 - Timetable, lesson plans, registers, gradebooks, CBT tasks, and messages**
- [ ] **Slice 4D.4 - URL/query protection and teacher audit history**

### Phase 4D check

- [ ] A teacher sees only their own active class and subject assignments.
- [ ] A teacher cannot access another teacher's gradebook or class by changing a URL.
- [ ] Class teachers and subject teachers see the correct distinct actions.
- [ ] The dashboard presents actionable work without exposing HR, salary, or unrelated student records.

## Phase 5 - Review, approval, and audit

### Phase 5 slices

- [ ] **Slice 5.1 - Lesson-plan review lifecycle**
- [ ] **Slice 5.2 - Class-record review lifecycle**
- [ ] **Slice 5.3 - Audit history and approved-record locking**

### Required UI

- Assigned class cards on the teacher dashboard
- Class selector limited to active assignments
- Student register limited to the selected class arm
- Clear `Draft`, `Submitted`, `Returned`, and `Approved` statuses
- Save draft and submit-for-review actions
- Correction reason shown when a record is returned
- Restricted state when no assignment exists
- Class and teacher identity displayed on every recording screen
- No unrestricted student dropdowns in teacher workflows

### Phase 5 deliverables

- Add `Draft`, `Submitted`, `Returned`, and `Approved` lifecycle states.
- Add principal/administrator review, correction reasons, and approval actions.
- Make approved records read-only to the class teacher.
- Add audit events for access denial, create, edit, submit, return, correction, and approval.
- Display the class arm and teacher identity on every recording screen.

### Phase 5 check

- Returned records can be corrected by the original teacher and retain the correction reason.
- Approved records cannot be edited by the teacher.
- Reviewers can identify who created, changed, submitted, returned, and approved each record.

## Phase 5B - CBT marking and result publication

### Phase 5B slices

- [ ] **Slice 5B.1 - Objective marking and manual-review queue**
- [ ] **Slice 5B.2 - Proctoring incident review and exam exception decisions**
- [ ] **Slice 5B.3 - School CBT publication and Practice CBT analytics separation**

### Phase 5B check

- [ ] Question versions and delivered order remain reproducible during review.
- [ ] Manual and exception decisions are audited before publication.
- [ ] Only approved School CBT results can feed official result records.

## Phase 6 - Validation and release

### Phase 6 slices

- [ ] **Slice 6.1 - Permission and scope tests**
- [ ] **Slice 6.2 - Teacher onboarding and lesson-plan workflow tests**
- [ ] **Slice 6.3 - Browser validation, documentation update, commit, and push**

### Data and permission functions

Introduce shared domain functions similar to:

- `getActiveClassTeacherAssignments(teacherId, session, term)`
- `getTeacherClassIds(teacherId, session, term)`
- `canTeacherAccessClass(teacherId, classId, session, term)`
- `getStudentsForAssignedClass(teacherId, classId, session, term)`
- `saveClassRecord(record, actor)`
- `submitClassRecord(recordId, actor)`
- `returnClassRecord(recordId, actor, reason)`
- `approveClassRecord(recordId, actor)`

Each mutation must re-check the assignment and role on the server/domain boundary.

### Primary-school constraints

- Class scope is based on the class arm, not only the level. For example, Primary 4A and Primary 4B are separate scopes.
- A teacher assigned to Primary 4A must not automatically access Primary 4B.
- A teacher may have more than one active class assignment when explicitly granted.
- Session and term changes must recalculate access.
- Withdrawn or transferred pupils remain in historical records but disappear from the active register after the effective date.

### Phase 6 acceptance checks

- A primary class teacher sees only assigned primary class arms.
- An unassigned teacher sees no class register and receives a restricted state.
- A teacher assigned to Primary 4A cannot open Primary 4B by changing a URL or class ID.
- The register contains only pupils enrolled in the selected assigned class.
- Attendance and class records can be saved as drafts and submitted for review.
- Returned records can be corrected by the original teacher with the reason preserved.
- Approved records cannot be edited by the teacher.
- Subject gradebook access still requires a matching subject assignment.
- Administrators and principals can manage assignments and review records.
- All access denials and record lifecycle actions create audit events.
- Focused permission, workflow, and browser checks pass before push.

### Phase 6 delivery checklist

- [ ] Primary class-teacher assignment data model
- [ ] Assignment management UI for administrators and principals
- [ ] Teacher class-scope resolver
- [ ] Scoped primary class register
- [ ] Attendance and class-record draft/submission workflow
- [ ] Review, return, and approval workflow
- [ ] Audit events and restricted states
- [ ] Session, term, class-arm, and enrollment tests
- [ ] Focused build and browser validation
- [ ] Commit and push to `origin/main`

## Recommended delivery order

To keep the experience professional without making the flow complex, deliver in this order:

1. **Teacher identity and scope:** enforce the signed-in teacher's class and subject assignments.
2. **Teacher profile and HR onboarding:** create the active staff record and restricted employment data.
3. **Lesson planning:** add weekly, term, and session plans for primary and secondary teachers.
4. **Question bank:** create, review, approve, tag, and version questions.
5. **CBT delivery:** add timed attempts, individualized delivery, autosave, and light proctoring.
6. **Student portal:** connect published results, learning tasks, announcements, and CBT recovery.
7. **Hardening:** move authoritative records and permissions to the server, then complete tests and browser validation.
