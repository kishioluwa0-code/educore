import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  GraduationCap,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import {
  ACTIVITY,
  APPROVALS,
  ATTENDANCE_TREND,
  EVENTS,
  FEE_COLLECTION,
  NEEDS_ATTENTION,
  PERFORMANCE_BY_LEVEL,
  SCHOOL,
} from "@/data/school";
import { formatDate, formatDateTime, greeting, naira } from "@/lib/format";
import { ROLE_LABELS, useRole, type UserRole } from "@/lib/role-context";
import { useStudents } from "@/data/student-store";
import { useEffect, useState } from "react";
import { CLASSES, EXAM_REGISTRATIONS, SUBJECTS, timetableFor } from "@/data/academics";
import { useAssignments } from "@/data/assessment-workflow";
import { getProfile } from "@/lib/role-profiles";
import { getPublishedRowsForStudent } from "@/data/gradebook-store";
import { getStaffAttendanceSummary } from "@/data/access-store";
import { useAccessEvents } from "@/data/access-store";
import { STAFF } from "@/data/school";
import { useAttendanceRecords } from "@/data/attendance-store";
import { getServerSchoolSetup } from "@/lib/school-api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EduCore" },
      {
        name: "description",
        content:
          "Daily operating picture for the school: attendance, academic performance, fee collection and items needing attention.",
      },
      { property: "og:title", content: "Dashboard — EduCore" },
      {
        property: "og:description",
        content: "Attendance, performance, fees and approvals at a glance.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11 };

function readDashboardRecords<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]") as T[];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function ChartTooltip() {
  return (
    <Tooltip
      cursor={{ fill: "var(--color-muted)" }}
      contentStyle={{
        borderRadius: 8,
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        fontSize: 12,
      }}
    />
  );
}

function Dashboard() {
  const { role, principal } = useRole();
  const [schoolStatus, setSchoolStatus] = useState<string>();
  useEffect(() => {
    if (role === "superadmin") return;
    getServerSchoolSetup().then((school) => setSchoolStatus(school.status)).catch(() => undefined);
  }, [role]);
  const students = useStudents();
  if (schoolStatus === "trial") return <AppShell><PageHeader title="Awaiting platform approval" description="Your school setup is saved. A superadmin must approve the school before the operational dashboard becomes available." breadcrumbs={[{ label: "EduCore" }, { label: "Dashboard" }]} actions={<Button asChild><Link to="/setup">Continue school setup</Link></Button>} /><SectionCard title="Onboarding in progress" description="You can continue configuring your school while approval is pending." /></AppShell>;
  if (role !== "administrator") return <RoleDashboard role={role} />;
  const attendanceRecords = useAttendanceRecords();
  const [approvedRequests, setApprovedRequests] = useState<string[]>([]);
  const attendanceApprovals = Object.values(attendanceRecords).filter((record) => record.status === "Submitted").length;
  const attendanceFollowUps = Object.values(attendanceRecords).reduce((count, record) => count + (record.followUps?.filter((item) => item.state !== "Resolved").length ?? 0), 0);
  const presentToday = students.filter((student) => student.attendance === "Present").length;
  const absentToday = students.filter((student) => student.attendance === "Absent").length;
  const outstandingFees = students.reduce((sum, student) => sum + student.feeBalance, 0);
  const collected = students.length ? FEE_COLLECTION.at(-1)?.collected ?? 0 : 0;
  const expected = students.length ? FEE_COLLECTION.at(-1)?.expected ?? 0 : 0;
  const attentionItems = students.length ? NEEDS_ATTENTION : [];
  const approvalItems = students.length ? APPROVALS : [];
  if (students.length === 0) {
    return <AppShell><PageHeader title="Your school workspace is ready" description="Complete onboarding and create your first database-backed records to populate the dashboard." breadcrumbs={[{ label: "EduCore" }, { label: "Dashboard" }]} actions={<Button asChild><Link to="/setup">Continue school setup</Link></Button>} /><SectionCard title="No operational data yet" description="Students, attendance, finance, assessments, and approvals will appear here after they are created through the application." /></AppShell>;
  }

  return (
    <AppShell>
      <PageHeader
        title={`${greeting()}, ${principal?.displayName ?? "Administrator"}`}
        description={`${SCHOOL.name} · ${SCHOOL.session} · ${SCHOOL.term}`}
        breadcrumbs={[{ label: "EduCore" }, { label: "Dashboard" }]}
        actions={
          <>
            <StatusBadge tone={students.length ? "success" : "warning"}>{students.length ? "School in session" : "Complete school setup"}</StatusBadge>
            <Button asChild size="sm">
              <Link to="/people/students/new">New admission</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          label="Total students"
          value={`${students.length}`}
          sub="Live student register"
          icon={Users}
          to="/people/students"
        />
        <KpiCard
          label="Present today"
          value={`${presentToday}`}
          sub={`${students.length ? Math.round((presentToday / students.length) * 100) : 0}% of register`}
          delta={{ value: "1.4%", direction: "up" }}
          icon={UserCheck}
          to="/attendance"
        />
        <KpiCard
          label="Absent today"
          value={`${absentToday}`}
          sub={`${students.filter((student) => student.attendance === "Late").length} late arrivals`}
          delta={{ value: "0.6%", direction: "up", good: false }}
          icon={UserX}
          tone="warning"
          to="/attendance"
        />
        <KpiCard
          label="Teaching staff"
          value="0"
          sub="No staff records yet"
          icon={GraduationCap}
          to="/people"
        />
        <KpiCard
          label="Outstanding fees"
          value={naira(outstandingFees, { compact: true })}
          sub={`${students.filter((student) => student.feeBalance > 0).length} students owing`}
          icon={CircleDollarSign}
          tone="danger"
          to="/finance"
        />
        <KpiCard
          label="Upcoming exams"
          value="0"
          sub="No examinations configured"
          icon={ClipboardList}
          to="/examinations"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="Needs attention"
          description="Items blocking daily operations. Each row opens the relevant workflow."
          action={
            <Button asChild variant="ghost" size="sm">
              <Link to="/security">Approval centre</Link>
            </Button>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {[...attentionItems, ...(attendanceFollowUps ? [{ id: "attendance-follow-ups", label: "Absence follow-ups awaiting contact", count: attendanceFollowUps, tone: "warning" as const, to: "/attendance" }] : [])].map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/60"
                >
                  <span
                    className={
                      item.tone === "danger"
                        ? "flex size-8 items-center justify-center rounded-md bg-danger-soft text-danger"
                        : item.tone === "warning"
                          ? "flex size-8 items-center justify-center rounded-md bg-warning-soft text-warning-foreground"
                          : "flex size-8 items-center justify-center rounded-md bg-info-soft text-info"
                    }
                  >
                    <AlertTriangle className="size-4" aria-hidden />
                  </span>
                  <span className="tabular w-8 text-lg font-semibold">{item.count}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Pending approvals"
          description="Requests waiting on your decision"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {[...approvalItems.filter((item) => !approvedRequests.includes(item.id)), ...(attendanceApprovals ? [{ id: "attendance-live", label: "Attendance registers awaiting approval", count: attendanceApprovals, tone: "warning" as const, to: "/attendance" }] : [])].map((a) => (
              <li key={a.id} className="space-y-1.5 px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{a.type}</span>
                  <span className="text-[11px] text-muted-foreground">{formatDate(a.date)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.subject} · requested by {a.requester}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setApprovedRequests((current) => [...current, a.id])}
                  >
                    Approve
                  </Button>
                  <Button asChild size="sm" variant="outline" className="h-7 px-2.5 text-xs">
                    <Link
                      to={
                        a.type === "Fee adjustment"
                          ? "/finance"
                          : a.type === "Grade correction"
                            ? "/assessment"
                            : "/security"
                      }
                    >
                      Review
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard title="Attendance this week" description="Whole-school daily capture">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={students.length ? ATTENDANCE_TREND : []} margin={{ left: -18, right: 6, top: 6 }}>
                <defs>
                  <linearGradient id="present" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-teal)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--color-teal)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axis} />
                <YAxis tickLine={false} axisLine={false} tick={axis} domain={[900, 1250]} />
                {ChartTooltip()}
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="var(--color-teal)"
                  strokeWidth={2}
                  fill="url(#present)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Academic performance" description="Class average by level, First Term">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={students.length ? PERFORMANCE_BY_LEVEL : []} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="level" tickLine={false} axisLine={false} tick={axis} />
                <YAxis tickLine={false} axisLine={false} tick={axis} domain={[0, 100]} />
                {ChartTooltip()}
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {PERFORMANCE_BY_LEVEL.map((d) => (
                    <Cell
                      key={d.level}
                      fill={d.average >= 75 ? "var(--color-teal)" : "var(--color-primary)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard
          title="Fee collection"
          description={`${naira(collected, { compact: true })} of ${naira(expected, { compact: true })} expected`}
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={students.length ? FEE_COLLECTION : []} margin={{ left: -8, right: 6, top: 6 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axis} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={axis}
                  tickFormatter={(v: number) => `${v / 1_000_000}M`}
                />
                {ChartTooltip()}
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="var(--color-border)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="Recent activity" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {ACTIVITY.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.who}</span> {a.what}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(a.when)}</p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Upcoming events" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {EVENTS.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                  <CalendarDays className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(e.date)} · {e.tag}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </AppShell>
  );
}

const ROLE_CONTENT: Record<
  Exclude<UserRole, "administrator">,
  { title: string; description: string; links: { label: string; to: string }[] }
> = {
  principal: {
    title: "Principal dashboard",
    description: "Whole-school performance, approvals and leadership decisions.",
    links: [
      { label: "Review results", to: "/assessment" },
      { label: "Open reports", to: "/reports" },
      { label: "View examinations", to: "/examinations" },
      { label: "Review attendance", to: "/attendance" },
      { label: "Review finance", to: "/finance" },
    ],
  },
  teacher: {
    title: "Teacher dashboard",
    description: "Your assigned classes, attendance registers and grade books.",
    links: [
      { label: "Mark attendance", to: "/attendance" },
      { label: "Open grade book", to: "/assessment" },
      { label: "View timetable", to: "/academics" },
    ],
  },
  bursar: {
    title: "Finance dashboard",
    description: "Collections, outstanding balances, invoices and reconciliation.",
    links: [
      { label: "Open finance", to: "/finance" },
      { label: "Outstanding fees", to: "/reports" },
    ],
  },
  examinations: {
    title: "Examination officer dashboard",
    description: "Examination schedules, candidate readiness and result publication.",
    links: [
      { label: "Manage examinations", to: "/examinations" },
      { label: "Review results", to: "/assessment" },
    ],
  },
  hr: {
    title: "HR dashboard",
    description: "Staff attendance, people records and operational workforce signals.",
    links: [
      { label: "Staff directory", to: "/people" },
      { label: "Attendance access", to: "/attendance" },
      { label: "People reports", to: "/reports" },
    ],
  },
  security: {
    title: "Security officer dashboard",
    description: "Gate activity, visitors, connected devices and security events.",
    links: [
      { label: "Open access control", to: "/attendance" },
      { label: "Security centre", to: "/security" },
      { label: "Operations", to: "/operations" },
    ],
  },
  parent: {
    title: "Parent / guardian dashboard",
    description: "Your child's attendance, results, fees and school communication.",
    links: [
      { label: "Student records", to: "/people/students" },
      { label: "Fees and invoices", to: "/finance" },
      { label: "Results", to: "/assessment" },
      { label: "Messages", to: "/communication" },
    ],
  },
  student: {
    title: "Student dashboard",
    description: "Your timetable, attendance, results, fees and school updates.",
    links: [
      { label: "My attendance", to: "/attendance" },
      { label: "My results", to: "/assessment" },
      { label: "Fees", to: "/finance" },
      { label: "School updates", to: "/communication" },
    ],
  },
};

function RoleDashboard({ role }: { role: Exclude<UserRole, "administrator"> }) {
  const students = useStudents();
  const { profileId } = useRole();
  const accessEvents = useAccessEvents();
  const assignments = useAssignments();
  const content = ROLE_CONTENT[role];
  const teacherAssignments = assignments.filter((assignment) => assignment.active);
  const teacherClassIds = new Set(teacherAssignments.map((assignment) => assignment.classId));
  const linkedProfile = getProfile(role, profileId);
  const visibleStudents =
    role === "parent" || role === "student"
      ? students.filter((student) => linkedProfile?.childIds.includes(student.id))
      : role === "teacher"
        ? students.filter((student) =>
            teacherClassIds.has(
              CLASSES.find(
                (classItem) => classItem.level === student.level && classItem.arm === student.arm,
              )?.id ?? "",
            ),
          )
        : students;
  const personalStudent = role === "student" ? visibleStudents[0] : undefined;
  const personalResults = personalStudent ? getPublishedRowsForStudent(personalStudent.id) : [];
  const personalClass = personalStudent
    ? CLASSES.find(
        (classItem) =>
          classItem.level === personalStudent.level && classItem.arm === personalStudent.arm,
      )
    : undefined;
  const personalTimetable = personalClass ? timetableFor(personalClass.id) : [];
  const linkedStudentId = linkedProfile?.childIds[0];
  const present = visibleStudents.filter(
    (student) => student.attendance === "Present" || student.attendance === "Late",
  ).length;
  const outstanding = visibleStudents.reduce((sum, student) => sum + student.feeBalance, 0);
  const storedPayments =
    role === "bursar" ? readDashboardRecords<{ amount: number }>("educore.finance-payments") : [];
  const storedInvoices =
    role === "bursar" ? readDashboardRecords<{ status: string }>("educore.finance-invoices") : [];
  const storedReconciliation =
    role === "bursar"
      ? readDashboardRecords<{ status: string }>("educore.finance-reconciliation")
      : [];
  const postedCollections = storedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const openInvoices = storedInvoices.filter((invoice) => invoice.status === "Open").length;
  const unmatchedPayments =
    storedPayments.length - storedReconciliation.filter((item) => item.status === "Matched").length;
  const staffAttendance = role === "hr" ? getStaffAttendanceSummary() : [];
  const staffOnCampus = staffAttendance.filter(
    (member) => member.currentStatus === "On campus",
  ).length;
  const staffOnLeave = STAFF.filter((member) => member.status === "On leave").length;
  const examCandidates = EXAM_REGISTRATIONS.reduce((sum, item) => sum + item.candidates, 0);
  const examRegistered = EXAM_REGISTRATIONS.reduce((sum, item) => sum + item.registered, 0);
  const examPending = examCandidates - examRegistered;
  const examFees = EXAM_REGISTRATIONS.reduce(
    (sum, item) => sum + (item.candidates - item.registered) * item.feePerCandidate,
    0,
  );
  const securityEvents = role === "security" ? accessEvents : [];
  const acceptedScans = securityEvents.filter((event) => event.ok).length;
  const rejectedScans = securityEvents.filter((event) => !event.ok).length;
  const campusPeople = new Set(
    securityEvents
      .filter((event) => event.ok && event.direction === "In")
      .map((event) => event.personId),
  ).size;
  const activeVisitors =
    role === "security"
      ? readDashboardRecords<{ outTime: string }>("educore.visitors").filter(
          (visitor) => visitor.outTime === "—",
        ).length
      : 0;
  return (
    <AppShell>
      <PageHeader
        title={content.title}
        description={`${ROLE_LABELS[role]} · ${content.description}`}
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Dashboard" }]}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={
            role === "bursar"
              ? "Outstanding fees"
              : role === "security"
                ? "Accepted scans"
                : role === "examinations"
                  ? "Eligible candidates"
                  : role === "hr"
                    ? "Staff records"
                    : role === "parent" || role === "student"
                      ? "Linked student"
                      : "Assigned students"
          }
          value={
            role === "bursar"
              ? naira(outstanding, { compact: true })
              : role === "security"
                ? `${acceptedScans}`
                : role === "examinations"
                  ? `${examCandidates}`
                  : role === "hr"
                    ? `${STAFF.length}`
                    : `${visibleStudents.length}`
          }
          sub={
            role === "bursar"
              ? "Current student balances"
              : role === "security"
                ? `${rejectedScans} rejected scan${rejectedScans === 1 ? "" : "s"}`
                : role === "examinations"
                  ? "Across external bodies"
                  : role === "hr"
                    ? `${staffOnLeave} on approved leave`
                    : role === "parent" || role === "student"
                      ? "Scoped to linked record"
                      : "Scoped to role workspace"
          }
          icon={CircleDollarSign}
        />
        <KpiCard
          label={
            role === "bursar"
              ? "Posted collections"
              : role === "examinations"
                ? "Registered candidates"
                : role === "security"
                  ? "People on campus"
                  : role === "hr"
                    ? "Staff on campus"
                    : "Attendance today"
          }
          value={
            role === "bursar"
              ? naira(postedCollections, { compact: true })
              : role === "examinations"
                ? `${examRegistered}`
                : role === "security"
                  ? `${campusPeople}`
                  : role === "hr"
                    ? `${staffOnCampus}/${STAFF.length}`
                    : `${visibleStudents.length ? Math.round((present / visibleStudents.length) * 100) : 0}%`
          }
          sub={
            role === "bursar"
              ? `${storedPayments.length} payment records`
              : role === "examinations"
                ? `${examCandidates ? Math.round((examRegistered / examCandidates) * 100) : 0}% registration completion`
                : role === "security"
                  ? "Latest accepted entry events"
                  : role === "hr"
                    ? "Accepted clock-in status"
                    : "Present or late"
          }
          icon={UserCheck}
        />
        <KpiCard
          label={
            role === "bursar"
              ? "Open invoices"
              : role === "examinations"
                ? "Registration pending"
                : role === "security"
                  ? "Visitors on campus"
                  : role === "hr"
                    ? "Payable-day records"
                    : "Academic period"
          }
          value={
            role === "bursar"
              ? `${openInvoices}`
              : role === "examinations"
                ? `${examPending}`
                : role === "security"
                  ? `${activeVisitors}`
                  : role === "hr"
                    ? `${staffAttendance.filter((member) => member.presentDays > 0).length}`
                    : SCHOOL.term
          }
          sub={
            role === "bursar"
              ? "Awaiting settlement"
              : role === "examinations"
                ? "Missing registration or fees"
                : role === "security"
                  ? "Badge holders not signed out"
                  : role === "hr"
                    ? "Staff with accepted attendance"
                    : SCHOOL.session
          }
          icon={CalendarDays}
        />
        <KpiCard
          label={
            role === "bursar"
              ? "Unreconciled"
              : role === "examinations"
                ? "Exam fees due"
                : role === "security"
                  ? "Security actions"
                  : role === "hr"
                    ? "Active staff"
                    : "Assigned actions"
          }
          value={
            role === "bursar"
              ? `${unmatchedPayments}`
              : role === "examinations"
                ? naira(examFees, { compact: true })
                : role === "security"
                  ? "4"
                  : role === "hr"
                    ? `${STAFF.filter((member) => member.status === "Active").length}`
                    : `${content.links.length}`
          }
          sub={
            role === "bursar"
              ? "Payments needing review"
              : role === "examinations"
                ? "External body balance"
                : role === "security"
                  ? "Access, visitors, devices, events"
                  : role === "hr"
                    ? "Current staff directory"
                    : "Available from your role"
          }
          icon={ClipboardList}
        />
      </div>
      {role === "security" && (
        <SectionCard
          title="Security control centre"
          description="Monitor campus movement and respond to access events without exposing finance, academic, or HR records."
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/attendance">
                Gate access log
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/attendance">
                Visitor register
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/security">
                Devices and sessions
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/security">
                Security audit log
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {securityEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{event.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.personType} · {event.gate} · {event.method}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge tone={event.ok ? "success" : "danger"}>
                    {event.ok ? event.direction : "Rejected"}
                  </StatusBadge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleTimeString("en-NG")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      {role === "hr" && (
        <SectionCard
          title="HR workforce control centre"
          description="Manage staff records and attendance without exposing student finance or assessment data."
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/people">
                Staff directory
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/attendance">
                Staff attendance
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/reports">
                Workforce reports
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {staffAttendance.map((member) => (
              <div
                key={member.staffId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {member.staffId} · {member.presentDays} payable day
                    {member.presentDays === 1 ? "" : "s"}
                  </p>
                </div>
                <StatusBadge tone={member.currentStatus === "On campus" ? "success" : "neutral"}>
                  {member.currentStatus}
                </StatusBadge>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      {role === "examinations" && (
        <SectionCard
          title="Examination control centre"
          description="Track registration readiness before submitting candidate data to examination bodies."
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="justify-start">
              <Link to="/examinations">
                External registrations
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/examinations">
                Candidate nominal rolls
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/examinations">
                Timetable and halls
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-start">
              <Link to="/assessment">
                Results and grade books
                <ArrowRight className="ml-auto size-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border rounded-md border border-border">
            {EXAM_REGISTRATIONS.map((item) => (
              <div
                key={item.body}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.level} · deadline {item.deadline}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm tabular">
                    {item.registered}/{item.candidates}
                  </span>
                  <StatusBadge tone={item.registered === item.candidates ? "success" : "warning"}>
                    {item.registered === item.candidates ? "Ready" : "Action needed"}
                  </StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
      {role === "principal" && (
        <SectionCard
          title="Principal oversight"
          description="Whole-school signals requiring leadership attention."
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Pending approvals</p>
              <p className="mt-1 text-xl font-semibold">{APPROVALS.length + attendanceApprovals}</p>
              <p className="text-xs text-muted-foreground">Results, fees and movement</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Fee collection</p>
              <p className="mt-1 text-xl font-semibold">
                {Math.round(
                  (FEE_COLLECTION.at(-1)!.collected / FEE_COLLECTION.at(-1)!.expected) * 100,
                )}
                %
              </p>
              <p className="text-xs text-muted-foreground">Latest reporting period</p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Top academic level</p>
              <p className="mt-1 text-xl font-semibold">
                {
                  PERFORMANCE_BY_LEVEL.reduce((best, row) =>
                    row.average > best.average ? row : best,
                  ).level
                }
              </p>
              <p className="text-xs text-muted-foreground">
                {Math.max(...PERFORMANCE_BY_LEVEL.map((row) => row.average))}% average
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Attendance trend</p>
              <p className="mt-1 text-xl font-semibold">
                {Math.round(
                  (ATTENDANCE_TREND.at(-1)!.present /
                    (ATTENDANCE_TREND.at(-1)!.present +
                      ATTENDANCE_TREND.at(-1)!.absent +
                      ATTENDANCE_TREND.at(-1)!.late)) *
                    100,
                )}
                %
              </p>
              <p className="text-xs text-muted-foreground">Latest school day</p>
            </div>
          </div>
        </SectionCard>
      )}
      {role === "teacher" && (
        <SectionCard
          title="Teaching workspace"
          description="Only assigned classes and subjects are shown here."
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Assigned classes</p>
              <p className="mt-1 text-xl font-semibold">{teacherClassIds.size}</p>
              <p className="text-xs text-muted-foreground">
                {[...teacherClassIds]
                  .map((id) => {
                    const classItem = CLASSES.find((item) => item.id === id);
                    return classItem ? `${classItem.level} ${classItem.arm}` : id;
                  })
                  .join(" · ") || "No active class assignment"}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Assigned subjects</p>
              <p className="mt-1 text-xl font-semibold">
                {new Set(teacherAssignments.map((assignment) => assignment.subjectCode)).size}
              </p>
              <p className="text-xs text-muted-foreground">
                {teacherAssignments
                  .map(
                    (assignment) =>
                      SUBJECTS.find((subject) => subject.code === assignment.subjectCode)?.name ??
                      assignment.subjectCode,
                  )
                  .join(" · ") || "No active subject assignment"}
              </p>
            </div>
          </div>
        </SectionCard>
      )}
      {role === "student" && personalStudent && (
        <SectionCard
          title={`My learning area · ${personalStudent.firstName} ${personalStudent.lastName}`}
          description={`${personalStudent.level} ${personalStudent.arm} · ${personalStudent.admissionNo}`}
          className="mt-6"
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Published subjects</p><p className="mt-1 text-xl font-semibold">{new Set(personalResults.map((result) => result.subjectName)).size}</p><p className="text-xs text-muted-foreground">Released results</p></div>
            <div className="rounded-md border border-border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">My attendance</p><p className="mt-1 text-xl font-semibold">{personalStudent.attendanceRate}%</p><p className="text-xs text-muted-foreground">Recorded attendance rate</p></div>
            <div className="rounded-md border border-border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Current average</p><p className="mt-1 text-xl font-semibold">{personalStudent.average}%</p><p className="text-xs text-muted-foreground">Academic standing: {personalStudent.academicStatus}</p></div>
            <div className="rounded-md border border-border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">Fee status</p><p className="mt-1 text-xl font-semibold">{personalStudent.feeBalance ? naira(personalStudent.feeBalance, { compact: true }) : "Cleared"}</p><p className="text-xs text-muted-foreground">{personalStudent.feeBalance ? "Balance due" : "No balance due"}</p></div>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]"><div className="rounded-md border border-border p-4"><p className="text-sm font-semibold">Today’s timetable</p><div className="mt-3 space-y-2">{personalTimetable[0]?.slots.slice(0, 4).map((slot) => <div key={slot.time} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{slot.time}</span><span className="font-medium">{slot.subject}</span></div>)}</div></div><div className="rounded-md border border-border p-4"><p className="text-sm font-semibold">Student actions</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><Button asChild variant="outline" className="justify-start"><Link to="/people/students/$studentId" params={{ studentId: personalStudent.id }}>My profile<ArrowRight className="ml-auto size-4" /></Link></Button><Button asChild variant="outline" className="justify-start"><Link to="/assessment">My results<ArrowRight className="ml-auto size-4" /></Link></Button><Button asChild variant="outline" className="justify-start"><Link to="/attendance">My attendance<ArrowRight className="ml-auto size-4" /></Link></Button><Button asChild variant="outline" className="justify-start"><Link to="/communication">School updates<ArrowRight className="ml-auto size-4" /></Link></Button></div></div></div>
        </SectionCard>
      )}
      <SectionCard
        title="Your work area"
        description="Open the workflow relevant to your role."
        className="mt-6"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {content.links.map((link) => (
            <Button key={link.to} asChild variant="outline" className="justify-start">
              {((role === "parent" && link.label === "Student records") || (role === "student" && link.label === "My profile")) && linkedStudentId ? <Link to="/people/students/$studentId" params={{ studentId: linkedStudentId }}><span>{link.label}</span><ArrowRight className="ml-auto size-4" /></Link> : <Link to={link.to}>
                {link.label}
                <ArrowRight className="ml-auto size-4" />
              </Link>}
            </Button>
          ))}
        </div>
      </SectionCard>
      <SectionCard
        title="Role boundary"
        description="Your navigation and available actions are limited to this role's responsibilities."
      >
        <p className="text-sm text-muted-foreground">
          Sensitive approvals, student records, finance actions and security controls require the
          appropriate authorized role.
        </p>
      </SectionCard>
    </AppShell>
  );
}
