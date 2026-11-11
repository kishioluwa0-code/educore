# Remix of Remix of EduStride Nigeria

DESIGN A COMPLETE, PRODUCTION-READY WEB APPLICATION UI/UX FOR A NIGERIAN SCHOOL OPERATING SYSTEM.

PRODUCT NAME:

Use a professional placeholder name such as "EduCore" throughout the design. The product should feel like a serious enterprise-grade Nigerian education management platform, not a basic school portal.

PRODUCT PURPOSE:

Design a comprehensive School Operating System for Nigerian schools covering nursery, primary, junior secondary and senior secondary education.

The system must support Nigerian curriculum structures and examination workflows including BECE, WAEC/WASSCE, NECO/SSCE and NABTEB, while keeping curriculum, grading, assessment and promotion rules configurable for individual schools.

The platform will eventually serve:

- School administrators

- Principal

- Vice Principal

- Academic coordinator

- Examination officer

- Teachers

- Form/class teachers

- Heads of department

- Finance/bursar

- HR

- Security personnel

- Non-teaching staff

- Parents

- Guardians

- Students

The product must be designed as a SCHOOL OPERATING SYSTEM rather than a simple dashboard.

==================================================

1. DESIGN DIRECTION

==================================================

Create a modern, premium, professional SaaS/enterprise interface.

The visual style should communicate:

- Trust

- Security

- Education

- Professionalism

- Efficiency

- Clarity

- Reliability

- Modern technology

Avoid:

- childish school graphics

- excessive bright colors

- cartoon-like illustrations

- cluttered dashboards

- excessive gradients

- oversized decorative elements

- unnecessary animations

- overly rounded "startup template" aesthetics

- excessive glassmorphism

Use a clean, sophisticated interface suitable for school executives and administrative staff.

The design should feel comparable in quality to a modern enterprise SaaS product.

==================================================

2. VISUAL SYSTEM

==================================================

Use a restrained professional color system.

Primary:

Deep blue / navy representing trust, education and authority.

Secondary:

A refined teal/green accent representing growth and learning.

Neutral:

White, soft gray, slate and charcoal.

Use color primarily for:

- navigation

- primary actions

- status

- data visualization

- important alerts

Do not make every component colorful.

Use semantic colors:

Success:

Green

Warning:

Amber

Danger:

Red

Information:

Blue

Neutral:

Gray

Ensure sufficient accessibility contrast.

==================================================

3. TYPOGRAPHY

==================================================

Use a modern highly readable sans-serif font.

Recommended:

Inter or a similar professional UI font.

Typography hierarchy:

Display

Large page titles

Heading 1

Major page sections

Heading 2

Subsections

Heading 3

Card titles

Body

Primary information

Small

Metadata

Caption

Secondary information

Numbers in dashboards should have strong visual hierarchy.

Student names, financial values, scores and important metrics should be easy to scan.

==================================================

4. DESIGN PRINCIPLES

==================================================

Follow these principles throughout the entire product:

1. CLARITY

Every page must immediately communicate:

- Where the user is

- What they can do

- What information matters

2. HIERARCHY

Important information should visually dominate secondary information.

3. CONSISTENCY

Use reusable components instead of designing every screen independently.

4. EFFICIENCY

Administrative tasks should require the minimum number of steps.

5. SAFETY

Sensitive operations should clearly communicate consequences.

6. ACCESSIBILITY

Design for users with different levels of technical ability.

7. RESPONSIVENESS

The product must work across:

- desktop

- laptop

- tablet

- mobile

8. DATA DENSITY

Administrative screens may contain large amounts of information but must remain readable.

==================================================

5. APPLICATION STRUCTURE

==================================================

Design the platform around these major modules:

DASHBOARD

PEOPLE

- Students

- Parents & Guardians

- Staff

- Non-Staff

STUDENT MANAGEMENT

- Admissions

- Student Profiles

- Student Movement

- Promotion

- Transfers

- Withdrawals

- Alumni

ACADEMICS

- Curriculum

- Classes

- Arms

- Subjects

- Departments

- Scheme of Work

- Lesson Planner

- Timetable

ASSESSMENT

- Assessment Schemes

- Grade Book

- Manual Marks

- CBT

- Assignments

- Results

EXAMINATIONS

- Internal Exams

- BECE

- WAEC/WASSCE

- NECO/SSCE

- NABTEB

ATTENDANCE & ACCESS

- Student Attendance

- Staff Attendance

- QR Attendance

- Fingerprint Attendance

- Manual Attendance

- Visitor Management

- Access Control

FINANCE

- Fee Structures

- Student Billing

- Invoices

- Payments

- Receipts

- Scholarships

- Discounts

- Outstanding Fees

COMMUNICATION

- Announcements

- Notifications

- Messages

- SMS

- Email

- Push Notifications

OPERATIONS

- Library

- Inventory

- Transport

- Hostel

REPORTS & ANALYTICS

SECURITY

- Roles

- Permissions

- Audit Logs

- Approval Workflows

- Devices

- Security Events

SETTINGS

- School Configuration

- Academic Sessions

- Terms

- Curriculum

- Grading

- Assessment

- Notification Settings

- ID Card Settings

- Report Card Settings

==================================================

6. ADMIN APPLICATION SHELL

==================================================

Create a professional desktop-first admin shell.

Structure:

TOP BAR:

- School logo

- Global search

- Current academic session

- Notifications

- Help

- User profile

- Role indicator

LEFT SIDEBAR:

- Dashboard

- People

- Students

- Academics

- Assessment

- Examinations

- Attendance & Access

- Finance

- Communication

- Operations

- Reports

- Security

- Settings

Sidebar should support:

- expanded state

- collapsed state

- active state

- hover state

- nested navigation

- notification counters

- permission-based visibility

Main content should never feel cramped.

Use a maximum readable content width where appropriate.

==================================================

7. GLOBAL SEARCH

==================================================

Create a powerful global search.

Allow administrators to search:

- student name

- student ID

- parent

- guardian

- staff

- class

- subject

- invoice

- result

- admission

- transfer

Search results must respect permissions.

Example:

Search:

"John Ade"

Results grouped by:

Students

Staff

Parents

Documents

Include:

- avatar/photo

- name

- ID

- class/role

- status

==================================================

8. DASHBOARD UX

==================================================

Create a highly useful administrative dashboard.

Do not fill it with decorative charts.

Prioritize actionable information.

Top section:

"Good morning, Administrator"

Show:

- Current session

- Current term

- School status

KPI cards:

Total Students

Present Today

Absent Today

Teaching Staff

Outstanding Fees

Upcoming Exams

Below:

Attendance Overview

Academic Performance

Fee Collection

Upcoming Events

Recent Activities

Pending Approvals

Alerts

Create a "Needs Attention" section.

Examples:

- 18 attendance corrections pending

- 7 results awaiting approval

- 12 students with incomplete records

- 5 transfer requests pending

- 3 fee disputes

The dashboard should allow users to click directly into the relevant workflow.

==================================================

9. STUDENT MANAGEMENT

==================================================

Design a powerful student management experience.

Student list should include:

- Student photo

- Student name

- Student ID

- Class

- Arm

- Gender

- Parent/guardian

- Attendance status

- Academic status

- Account/status

- Actions

Actions:

- View

- Edit

- Attendance

- Results

- Fees

- Documents

- Movement

- More

Include:

- Search

- Filters

- Advanced filters

- Sorting

- Pagination

- Bulk selection

- Bulk actions

- Export

- Import

Student profile should have tabs:

Overview

Personal Information

Parents & Guardians

Academic

Attendance

Results

Fees

Documents

Behaviour

Movement History

Audit History

The profile header should show:

Student photo

Full name

Student ID

Current class

Arm

Academic session

Status

QR identity

==================================================

10. STUDENT ADMISSION FLOW

==================================================

Design a multi-step admission wizard.

Step 1:

Personal Information

Step 2:

Parent/Guardian

Step 3:

Academic Information

Step 4:

Documents

Step 5:

Review

Step 6:

Confirmation

Show progress clearly.

Prevent accidental loss of information.

Include:

- Save draft

- Continue later

- Validation

- Required fields

- Error messages

After approval:

Generate:

- Student ID

- QR identity

- Student profile

- Admission number

- Initial class placement

==================================================

11. PARENT/GUARDIAN LINKING

==================================================

Create a secure parent linking system.

Student profile should show:

Parents & Guardians

Each relationship displays:

- Name

- Relationship

- Phone

- Email

- Verification status

- Primary guardian

- Financial responsibility

- Pickup authorization

Allow:

"Add Guardian"

Workflow:

Search existing guardian

OR

Create new guardian

Then:

Send/verify link

→ Review

→ Approve

→ Active

Clearly show permissions.

A parent can have multiple children.

Create parent interface:

"My Children"

Each child appears as a card with:

- Photo

- Name

- Class

- Attendance

- Latest result

- Fee balance

- Alerts

==================================================

12. IDENTITY CARD SYSTEM

==================================================

Design an ID card management module.

Every student, staff member and authorized non-staff user can receive a unique identity card.

Card should contain:

- School logo

- Photo

- Full name

- ID number

- Role/class

- Academic session where appropriate

- QR code

- Optional emergency/contact information according to school configuration

Do not expose unnecessary sensitive data inside QR codes.

Provide:

Generate ID

Preview

Print

Download

Regenerate

Deactivate

Replace

Support bulk generation.

==================================================

13. ATTENDANCE

==================================================

Attendance is a major feature.

Create a dedicated attendance dashboard.

Show:

Present

Absent

Late

Excused

Include:

- Date

- Session

- Term

- Class

- Arm

- Attendance method

Methods:

QR SCAN

FINGERPRINT

MANUAL

QR workflow:

Select attendance session

→ Open scanner

→ Scan ID

→ Validate identity

→ Record attendance

→ Show confirmation

Success state:

"Attendance recorded"

Include timestamp and person name.

Fingerprint workflow:

Select device

→ Verify fingerprint

→ Match identity

→ Record attendance

Manual workflow:

Class list

→ Mark students

→ Save

→ Confirm

Manual corrections require:

- reason

- authorization where required

- audit entry

==================================================

14. OFFLINE ATTENDANCE

==================================================

Design an offline state.

When internet is unavailable:

Show:

"Offline Mode"

"Attendance records will sync automatically when connection is restored."

Display:

Pending sync:

27 records

After connection:

"27 records synced successfully."

Clearly distinguish:

- Local

- Syncing

- Synced

- Failed

==================================================

15. ACADEMIC STRUCTURE

==================================================

Create screens for:

Academic Session

Terms

Sections

Levels

Classes

Arms

Departments

Subjects

Example:

2026/2027

→ Secondary

→ JSS

→ JSS 2

→ JSS 2A

The UI should make hierarchy obvious.

==================================================

16. NIGERIAN CURRICULUM

==================================================

Create a curriculum management interface.

Hierarchy:

Curriculum

→ Version

→ Level

→ Subject

→ Term

→ Scheme of Work

→ Topic

→ Subtopic

→ Learning Objective

Show curriculum coverage visually.

Example:

Mathematics

Term 1

Coverage:

82%

Completed:

18 topics

Remaining:

4 topics

Allow teachers to mark lessons as completed.

==================================================

17. ASSESSMENT ENGINE

==================================================

Design a configurable assessment system.

Assessment scheme example:

Assignment 10%

Test 20%

CA 10%

Midterm 10%

Exam 50%

Do not hard-code these values.

School administrators should configure them.

Assessment creation:

Name

Type

Subject

Class

Term

Weight

Maximum score

Date

Teacher

Status

==================================================

18. MARKS ENTRY

==================================================

Design a professional grade book.

Table:

Student

ID

CA

Test

Assignment

Exam

Total

Grade

Remark

Allow:

- keyboard navigation

- quick entry

- validation

- autosave draft

- submit

- review

- approval

Clearly distinguish editable vs locked cells.

==================================================

19. MARK SECURITY

==================================================

Marks must have strong workflow states.

Draft

→ Submitted

→ Under Review

→ Approved

→ Locked

→ Published

Locked results must visually appear locked.

Show:

"Results are locked and cannot be edited."

If correction is required:

Request Correction

→ Reason

→ Approval

→ Edit

→ Re-submit

→ Audit

Never provide a hidden bypass.

==================================================

20. CBT

==================================================

Design CBT management.

Modules:

Question Bank

Create Exam

Exam Instructions

Candidate Selection

Exam Schedule

CBT Interface

Submission

Auto Marking

Review

Results

CBT should visually connect to the same assessment/result engine used for manual marks.

==================================================

21. EXAMINATION MANAGEMENT

==================================================

Create an examination dashboard.

Tabs:

Internal Exams

BECE

WAEC/WASSCE

NECO/SSCE

NABTEB

Mock Exams

Each examination should show:

Candidates

Subjects

Timetable

Registration

Results

Status

Documents

Use badges and progress indicators.

==================================================

22. RESULTS

==================================================

Design result management.

Result workflow:

Assessment

+

Exam

+

Attendance

↓

Calculation

↓

Review

↓

Approval

↓

Lock

↓

Publish

Result page should display:

Student information

Subject scores

Grades

Remarks

Average

Attendance

Position where configured

Teacher comment

Principal comment

Promotion status

Include:

Preview

Approve

Lock

Publish

Print

Download PDF

==================================================

23. RESULT VERIFICATION

==================================================

Create a secure result verification page.

Input:

Result Verification Code

OR

Scan QR

Display only authorized verification information.

Show:

Verified

School

Student

Session

Term

Result reference

Verification date

==================================================

24. PROMOTION

==================================================

Create promotion management.

Show:

Current Class

Academic Performance

Attendance

Required Subjects

Promotion Rules

Eligibility

Statuses:

Eligible

Needs Review

Not Eligible

Allow:

Review

Approve

Reject

Promote

Bulk promotion should require confirmation.

==================================================

25. TRANSFERS

==================================================

Create transfer management.

Types:

Internal Class Transfer

Arm Transfer

Department Transfer

Campus Transfer

School Transfer

Show:

Current placement

Requested placement

Reason

Documents

Requested by

Approval status

Date

Maintain complete movement history.

==================================================

26. FINANCE

==================================================

Create finance dashboard.

Cards:

Total Expected

Collected

Outstanding

Overdue

Payments Today

Modules:

Fee Structure

Student Billing

Invoices

Payments

Receipts

Scholarships

Discounts

Arrears

Use Nigerian Naira formatting.

Example:

₦250,000

Do not use USD-style formatting.

==================================================

27. PARENT PORTAL

==================================================

Create a mobile-friendly parent experience.

Dashboard:

Good morning, Mrs. Ade

"My Children"

Child cards:

Photo

Name

Class

Attendance

Latest Result

Fee Balance

Sections:

Attendance

Results

Assignments

Timetable

Fees

Payments

Announcements

Messages

Documents

Parents must only see students they are authorized to access.

==================================================

28. TEACHER PORTAL

==================================================

Teacher dashboard:

My Classes

My Subjects

Today's Timetable

Attendance

Pending Marks

Assignments

Lesson Planner

Scheme of Work

CBT

Results

Messages

Show actionable tasks prominently.

Example:

"3 grade books awaiting submission"

==================================================

29. STUDENT PORTAL

==================================================

Student dashboard:

Today's Classes

Timetable

Assignments

Learning Materials

Attendance

Results

CBT

Announcements

Profile

Use a simpler interface than the admin dashboard.

==================================================

30. COMMUNICATION

==================================================

Central notification center.

Channels:

In-app

Push

Email

SMS

Notification examples:

Attendance alert

Result published

Fee reminder

Assignment

Announcement

Exam reminder

Use priority levels.

==================================================

31. REPORTS

==================================================

Create a reporting center.

Categories:

Academic

Attendance

Students

Finance

Staff

Examinations

Operations

Every report should support:

Filters

Date range

Session

Term

Class

Export

Print

PDF

Excel/CSV where appropriate

==================================================

32. SECURITY CENTER

==================================================

Create a professional security dashboard.

Sections:

Roles

Permissions

Audit Logs

Approval Requests

Devices

Sessions

Security Events

Audit log table:

User

Action

Resource

Date

IP/device where appropriate

Status

Provide filters.

==================================================

33. WORKFLOW / APPROVAL CENTER

==================================================

Create a centralized approval inbox.

Examples:

Grade correction

Attendance correction

Promotion

Transfer

Guardian linking

Fee adjustment

Result publishing

Each request should show:

Request type

Requester

Date

Reason

Affected record

Current status

Actions:

Approve

Reject

Request clarification

==================================================

34. DOCUMENT MANAGEMENT

==================================================

Create a document center.

Support:

Student documents

Staff documents

Admission documents

Finance documents

School documents

Show:

File name

Type

Owner

Uploaded by

Date

Status

Permissions

==================================================

35. GLOBAL COMPONENT SYSTEM

==================================================

Create reusable components.

Buttons:

Primary

Secondary

Tertiary

Danger

Ghost

Inputs:

Text

Number

Search

Select

Multi-select

Date

Date range

File upload

Textarea

Data:

Tables

Cards

Lists

Charts

KPI cards

Timeline

Activity feed

Feedback:

Toast

Alert

Banner

Modal

Drawer

Confirmation dialog

Navigation:

Sidebar

Topbar

Breadcrumb

Tabs

Pagination

Status:

Badge

Pill

Indicator

==================================================

36. DATA TABLE UX

==================================================

Tables are extremely important.

Provide:

- Sticky header

- Sort

- Search

- Filter

- Column visibility

- Pagination

- Row selection

- Bulk actions

- Responsive behavior

- Empty state

- Loading state

Avoid excessively dense tables.

==================================================

37. EMPTY STATES

==================================================

Every major page must have a meaningful empty state.

Example:

"No students found"

"Try changing your filters or add your first student."

Provide relevant CTA.

Do not use empty decorative illustrations that don't help the user.

==================================================

38. LOADING STATES

==================================================

Use skeleton loaders for:

- Dashboard cards

- Tables

- Profiles

- Charts

Avoid excessive spinners.

==================================================

39. ERROR STATES

==================================================

Errors must explain:

What happened

Why it happened

What the user can do

Example:

"Unable to load attendance records."

"Check your connection and try again."

CTA:

Retry

==================================================

40. CONFIRMATION UX

==================================================

Destructive actions must require confirmation.

Examples:

Delete

Deactivate

Withdraw

Reject

Unlock result

Cancel payment

For high-risk actions require:

Confirmation

Reason

Possibly second-level approval

==================================================

41. RESPONSIVE DESIGN

==================================================

ADMIN:

Desktop-first.

TEACHER:

Desktop/tablet optimized.

PARENT:

Mobile-first.

STUDENT:

Mobile-first.

On mobile:

- Sidebar becomes drawer

- Tables become cards or horizontally scrollable

- Actions become bottom sheets

- Forms become stacked

- Important actions remain accessible

==================================================

42. ACCESSIBILITY

==================================================

Follow strong accessibility practices.

Include:

- readable contrast

- keyboard navigation

- visible focus

- accessible labels

- semantic hierarchy

- large enough touch targets

- meaningful error messages

- don't rely on color alone

==================================================

43. SECURITY UX

==================================================

Sensitive operations should communicate clearly.

Examples:

Locked Result:

"Result locked"

"Editing is disabled. Request a correction to modify this record."

Permission restriction:

"You don't have permission to perform this action."

Session warning:

"Your session is about to expire."

Suspicious login:

"New device detected."

==================================================

44. AUDIT UX

==================================================

For sensitive records provide:

"View History"

Timeline:

Created

Edited

Submitted

Reviewed

Approved

Locked

Published

Each event shows:

User

Date/time

Action

Reason where applicable

==================================================

45. DESIGN STATES

==================================================

Every important component should include:

Default

Hover

Focus

Active

Disabled

Loading

Success

Warning

Error

Locked

Every page should include:

Loading

Empty

Populated

Error

Permission restricted

==================================================

46. DASHBOARD VISUALIZATION

==================================================

Use charts only where useful.

Examples:

Attendance trend

Academic performance

Fee collection

Student population

Grade distribution

Curriculum coverage

Avoid charts that don't support decisions.

==================================================

47. MICRO-INTERACTIONS

==================================================

Use subtle professional animations.

Examples:

Button loading

Successful save

Drawer opening

Tab transition

Table filtering

Status change

Notification appearance

Keep animations fast and purposeful.

Do not use distracting animation.

==================================================

48. INFORMATION ARCHITECTURE

==================================================

The system should feel predictable.

Users should always understand:

Where am I?

What am I viewing?

What can I do?

What happened?

What happens next?

Use:

Breadcrumbs

Page titles

Tabs

Clear CTA

Consistent navigation

==================================================

49. DESIGN FOR REAL NIGERIAN SCHOOL OPERATIONS

==================================================

The interface must support realistic Nigerian school workflows.

Use:

- Nigerian Naira

- Nigerian academic structures

- BECE

- WAEC/WASSCE

- NECO

- NABTEB

- Continuous Assessment

- Classes and arms

- School terms

- Parent/guardian relationships

- Student promotion

- Student transfer

- School identity cards

- QR attendance

- biometric attendance

- manual attendance

- offline workflows

Do not assume every school has perfect internet.

==================================================

50. FINAL PRODUCT FEEL

==================================================

The finished interface should feel:

Professional

Modern

Trustworthy

Secure

Fast

Organized

Scalable

Enterprise-grade

Education-focused

Nigeria-ready

It should NOT feel like:

- a generic CRM

- a generic school template

- a simple WordPress dashboard

- a colorful children's application

- a generic admin template

It should feel like a serious digital infrastructure platform for running a modern Nigerian school.

==================================================

51. FIGMA FILE ORGANIZATION

==================================================

Create the Figma project using:

PAGE 01:

Foundations

PAGE 02:

Design System

PAGE 03:

Admin App Shell

PAGE 04:

Admin Dashboard

PAGE 05:

People & Students

PAGE 06:

Academics

PAGE 07:

Assessment

PAGE 08:

Examinations & Results

PAGE 09:

Attendance & Access

PAGE 10:

Finance

PAGE 11:

Communication

PAGE 12:

Reports

PAGE 13:

Security

PAGE 14:

Teacher Portal

PAGE 15:

Parent Portal

PAGE 16:

Student Portal

PAGE 17:

Responsive / Mobile

PAGE 18:

Prototype Flows

==================================================

52. FIRST DESIGN TARGET

==================================================

DO NOT generate every screen immediately.

Start with:

1. Design foundations

2. Design system components

3. Admin application shell

4. Admin dashboard

5. School setup flow

6. Student management

7. Student admission

8. Parent/guardian linking

9. Student ID/QR generation

10. Student profile

These screens must be designed as one connected product experience.

After that continue to:

Attendance

Academics

Assessment

CBT

Examinations

Results

Promotion

Transfers

Finance

Parent

Teacher

Student

Reports

Security

==================================================

53. PROTOTYPE REQUIREMENT

==================================================

Create clickable prototype flows for the most important workflows.

FLOW 1:

Admin Login

→ Dashboard

FLOW 2:

School Setup

→ Academic Setup

→ Ready

FLOW 3:

Add Student

→ Link Guardian

→ Generate Student ID

→ Generate QR

FLOW 4:

Attendance

→ Scan QR

→ Verify

→ Record Attendance

FLOW 5:

Teacher

→ Grade Book

→ Enter Marks

→ Submit

→ Review

FLOW 6:

Admin

→ Approve

→ Lock

→ Publish Result

FLOW 7:

Promotion

→ Eligibility

→ Review

→ Approve

→ New Class

FLOW 8:

Parent

→ Login

→ Select Child

→ View Attendance

→ View Result

==================================================

54. IMPORTANT UX RULE

==================================================

DO NOT design isolated screens.

Every screen must connect to:

- previous state

- next action

- underlying data

- permissions

- workflow

- success state

- error state

Design the application as a complete system.

==================================================

55. FINAL OUTPUT

==================================================

Produce a high-fidelity, production-ready web application design.

The design should be:

- clean

- premium

- highly usable

- accessible

- responsive

- modular

- component-driven

- data-rich but not cluttered

- optimized for real administrative workflows

Prioritize UX quality over visual decoration.

The final product should look like a world-class School Management / School Operating System designed specifically for the Nigerian education ecosystem.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5a723765-8311-48f5-aead-f57f66744f7d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
