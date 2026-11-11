# EduCore — Nigerian School Operating System (Phase 1)

A high-fidelity, production-quality web UI built as a real React app (not a Figma file — Lovable builds live interfaces). Phase 1 delivers the ten connected screens named in your "First Design Target", all wired into one navigable product with realistic Nigerian demo data. No backend yet; state is in-memory so every flow is clickable end to end.

## Visual foundations

- Palette: deep navy primary (`#0f1b3d` / `#1e3a5f` range), refined teal accent for growth/positive, slate + soft gray neutrals, semantic green/amber/red/blue. Color reserved for nav, primary actions, status and data — surfaces stay neutral.
- Type: Inter throughout. Display / H1 / H2 / H3 / Body / Small / Caption scale, with tabular numerals for scores, money and metrics.
- Restrained radii, 1px hairline borders, low-elevation shadows, fast purposeful motion. No gradients, glass, or illustrations.
- Naira formatting (₦250,000) everywhere money appears.

## Screens in this phase

1. **Admin login** — split navy panel, session/role context, route into the shell.
2. **App shell** — top bar (logo, global search, session/term selector, notifications, help, profile + role badge) and left sidebar with all 13 module groups, nested items, active/hover states, collapse toggle, counters, mobile drawer.
3. **Global search** — command-palette overlay, results grouped into Students / Staff / Parents / Documents with avatar, ID, class/role and status.
4. **Admin dashboard** — greeting with session/term/school status, six KPI cards, attendance trend, performance and fee-collection charts, "Needs Attention" queue where each row deep-links into its workflow, recent activity, pending approvals.
5. **School setup flow** — school profile → academic session & terms → sections/levels/classes/arms → grading & assessment scheme → ready state.
6. **Student management** — dense but readable data table: photo, name, ID, class, arm, gender, guardian, attendance, academic and account status, row actions, filters, advanced filters, sort, column visibility, bulk select + bulk actions, import/export, pagination, empty/loading/error states.
7. **Admission wizard** — 6 steps (personal, guardian, academic, documents, review, confirmation) with progress rail, validation, save-draft/continue-later, and a confirmation that issues admission number, student ID, QR identity and class placement.
8. **Guardian linking** — guardian list on the student profile with relationship, verification, primary/financial/pickup flags; add-guardian drawer that searches existing or creates new, then verify → review → approve → active.
9. **Student ID / QR** — card preview (logo, photo, name, ID, class, session, QR), generate / preview / print / download / regenerate / deactivate / replace, plus bulk generation.
10. **Student profile** — header (photo, name, ID, class, arm, session, status, QR) and tabs: Overview, Personal, Guardians, Academic, Attendance, Results, Fees, Documents, Behaviour, Movement, Audit.

## Component system built alongside

Buttons (primary/secondary/tertiary/danger/ghost), inputs incl. select, multi-select, date & range, file upload; data table primitive with sticky header, tabs, breadcrumbs, pagination, badges/pills/indicators, KPI card, timeline, activity feed, toast, alert, banner, modal, drawer, confirmation dialog with reason capture, skeletons, empty and error states. Every listed page ships loading / empty / populated / error / permission-restricted variants.

## Technical notes

- TanStack Start file routes: `/login`, `/setup`, `/dashboard`, `/people/students`, `/people/students/new`, `/people/students/$id`, `/people/students/ids`, with `/` redirecting to the dashboard. Remaining modules get placeholder routes so no sidebar link dead-ends.
- Design tokens defined in `src/styles.css` (`@theme inline` + oklch values); components use semantic tokens only.
- Demo data in a typed `src/data/` layer (students, guardians, staff, classes, fees, activity) so later Cloud wiring is a swap, not a rewrite.
- Charts via Recharts; QR rendered client-side.
- Per-route `head()` metadata; admin surfaces `noindex`.

## Later phases (not this build)

Attendance (QR / fingerprint / manual / offline sync), academics & curriculum coverage, assessment engine & grade book with the draft→published lock workflow, CBT, examinations (BECE/WAEC/NECO/NABTEB), results & verification, promotion, transfers, finance, communication, reports, security centre, approval inbox, and the teacher / parent / student portals.
