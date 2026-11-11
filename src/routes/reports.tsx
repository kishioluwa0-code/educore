import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, BarChart3, Download, FileText, GraduationCap, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudents } from "@/data/student-store";
import { useAttendanceRecords } from "@/data/attendance-store";
import { canFinanceAction, getFinanceReportSnapshot, useFinanceStore } from "@/data/finance-store";
import { useGradeBookCounts } from "@/data/gradebook-store";
import { getCbtAttempts } from "@/data/cbt-store";
import { SESSIONS, TERMS, PERFORMANCE_BY_LEVEL } from "@/data/school";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/reports")({ head: () => ({ meta: [{ title: "Reports & Analytics — EduCore" }, { name: "description", content: "Live, filterable academic, attendance, finance and examination reporting." }, { name: "robots", content: "noindex" }] }), component: ReportsPage });

function ReportsPage() {
  const students = useStudents();
  const attendanceRecords = useAttendanceRecords();
  const finance = useFinanceStore();
  const gradeBooks = useGradeBookCounts();
  const { role } = useRole();
  const [session, setSession] = useState(SESSIONS[0]!);
  const [term, setTerm] = useState(TERMS[0]!);
  const canExport = canFinanceAction(role, "export");
  const financeSnapshot = useMemo(() => getFinanceReportSnapshot(session, term), [session, term]);
  const attendanceEntries = Object.values(attendanceRecords);
  const present = attendanceEntries.reduce((sum, record) => sum + Object.values(record.marks).filter((mark) => mark === "Present" || mark === "Late").length, 0);
  const marked = attendanceEntries.reduce((sum, record) => sum + Object.keys(record.marks).length, 0);
  const attendanceRate = marked ? Math.round((present / marked) * 100) : 0;
  const expected = financeSnapshot.expected;
  const outstanding = financeSnapshot.outstanding;
  const feeRate = expected ? Math.round(((expected - outstanding) / expected) * 100) : 0;
  const classRows = useMemo(() => PERFORMANCE_BY_LEVEL.map((row) => ({ ...row, students: students.filter((student) => student.level === row.level).length, outstanding: students.filter((student) => student.level === row.level).reduce((sum, student) => sum + student.feeBalance, 0) })), [students]);
  const alerts = students.filter((student) => student.feeBalance > 0 || student.attendance === "Absent" || student.academicStatus === "Needs support");
  const cbtAttempts = getCbtAttempts();
  const cbtRate = cbtAttempts.length ? Math.round((cbtAttempts.reduce((sum, attempt) => sum + attempt.score / attempt.total, 0) / cbtAttempts.length) * 100) : 0;
  const exportReport = () => { if (!canExport) return; const csv = ["Level,Average,Students,Outstanding", ...classRows.map((row) => `${row.level},${row.average},${row.students},${row.outstanding}`)].join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `educore-report-${session}-${term}.csv`; link.click(); URL.revokeObjectURL(link.href); toast.success("Report exported"); };
  return <AppShell><PageHeader title="Reports & Analytics" description="Live leadership reporting across academic performance, attendance, finance, examinations and alerts." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Reports & Analytics" }]} actions={<><Select value={session} onValueChange={setSession}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent>{SESSIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Select value={term} onValueChange={setTerm}><SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent>{TERMS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select><Button size="sm" disabled={!canExport} onClick={exportReport}><Download className="size-4" /> Export report</Button></>} /><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><KpiCard label="Students enrolled" value={`${students.length}`} sub={`${session} · ${term}`} icon={Users} /><KpiCard label="Attendance rate" value={`${attendanceRate}%`} sub="Live attendance records" icon={TrendingUp} /><KpiCard label="Fee collection" value={`${feeRate}%`} sub={`₦${outstanding.toLocaleString("en-NG")} outstanding`} icon={FileText} /><KpiCard label="Academic average" value={`${Math.round(classRows.reduce((sum, row) => sum + row.average, 0) / Math.max(1, classRows.length))}%`} sub="Across all levels" icon={GraduationCap} /><KpiCard label="CBT average" value={`${cbtRate}%`} sub={`${cbtAttempts.length} attempts`} icon={BarChart3} /></div><div className="mt-6 grid gap-4 xl:grid-cols-2"><SectionCard title="Class performance" description="Average score, enrolment and debt by level." bodyClassName="p-0"><div className="divide-y divide-border">{classRows.map((row) => <div key={row.level} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><span className="w-16 font-medium">{row.level}</span><div className="h-2 min-w-[100px] flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-teal" style={{ width: `${row.average}%` }} /></div><span className="tabular w-12 text-right font-semibold">{row.average}%</span><span className="text-xs text-muted-foreground">{row.students} students · ₦{row.outstanding.toLocaleString("en-NG")} debt</span></div>)}</div></SectionCard><SectionCard title="Leadership alert board" description="Students and operational areas needing attention." bodyClassName="p-0">{alerts.length ? <div className="divide-y divide-border">{alerts.slice(0, 8).map((student) => <div key={student.id} className="flex items-center gap-3 px-5 py-3 text-sm"><AlertTriangle className="size-4 text-warning" /><span className="min-w-0 flex-1 font-medium">{student.firstName} {student.lastName}</span>{student.feeBalance > 0 && <StatusBadge tone="danger">Fee debt</StatusBadge>}{student.attendance === "Absent" && <StatusBadge tone="warning">Absent</StatusBadge>}{student.academicStatus === "Needs support" && <StatusBadge tone="info">Support</StatusBadge>}</div>)}</div> : <p className="p-5 text-sm text-muted-foreground">No current leadership alerts.</p>}</SectionCard></div><div className="mt-4 grid gap-4 xl:grid-cols-2"><SectionCard title="Assessment and examination status" description="Current gradebook workflow and CBT performance."><div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Submitted gradebooks</p><p className="mt-1 text-xl font-semibold">{gradeBooks.Submitted}</p></div><div><p className="text-xs text-muted-foreground">Published gradebooks</p><p className="mt-1 text-xl font-semibold">{gradeBooks.Published}</p></div><div><p className="text-xs text-muted-foreground">CBT attempts</p><p className="mt-1 text-xl font-semibold">{cbtAttempts.length}</p></div></div></SectionCard><SectionCard title="Attendance trend" description="Register coverage and exceptions from live attendance records."><div className="space-y-3"><div className="flex items-center justify-between text-sm"><span>Marked attendance</span><span className="tabular font-semibold">{marked} records</span></div><div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-teal" style={{ width: `${attendanceRate}%` }} /></div><p className="text-xs text-muted-foreground">{marked - present} absent or late marks require follow-up.</p></div></SectionCard></div></AppShell>;
}
