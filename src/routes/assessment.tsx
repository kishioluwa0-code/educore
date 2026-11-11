import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileUp,
  Clock,
  FileCheck,
  FilePenLine,
  GraduationCap,
  MonitorPlay,
  PlayCircle,
  RotateCcw,
  Save,
  Send,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge, gradeBookTone } from "@/components/kit/status-badge";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CLASSES, GRADE_BOOKS, CBT_SESSIONS, total, waecGrade, SUBJECTS } from "@/data/academics";
import { fullName } from "@/data/school";
import { initials } from "@/lib/format";
import { useAcademicContext } from "@/lib/academic-context";
import { getPublishedGradeBooks, recordCbtExamScore, recordGradeBookAudit, reviewGradeBook, saveGradeBook, useGradeBook, useGradeBookCounts, useModerationQueue, type GradeBookRecord, type GradeBookStatus } from "@/data/gradebook-store";
import { assignTeacher, isAssigned, useAssignments, type AssessmentRole } from "@/data/assessment-workflow";
import { STAFF } from "@/data/school";
import { useRole } from "@/lib/role-context";
import { getProfile } from "@/lib/role-profiles";
import { useStudents } from "@/data/student-store";
import { getPublishedRowsForStudent } from "@/data/gradebook-store";
import { getCbtAttempts, getCbtRegistrations, isCbtCandidate, registerCbtCandidates, saveCbtAttempt, type CbtAttempt } from "@/data/cbt-store";
import { recordResultPublication } from "@/data/result-publication-store";

export const Route = createFileRoute("/assessment")({
  head: () => ({
    meta: [
      { title: "Assessment & Grade Book — EduCore" },
      {
        name: "description",
        content:
          "Configurable assessment schemes, grade book, manual marks, CBT, assignments and results for Nigerian schools.",
      },
      { property: "og:title", content: "Assessment & Grade Book — EduCore" },
      {
        property: "og:description",
        content: "Configurable assessment schemes, grade book, manual marks, CBT, assignments and results.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AssessmentPage,
});

const SCHEMES = [
  {
    id: "SCH-001",
    name: "Junior Secondary — Continuous Assessment",
    level: "JSS 1 – JSS 3",
    weights: [
      { label: "CA 1", weight: 20 },
      { label: "CA 2", weight: 20 },
      { label: "Assignment", weight: 10 },
      { label: "Examination", weight: 50 },
    ],
    active: true,
  },
  {
    id: "SCH-002",
    name: "Senior Secondary — WAEC/NECO Aligned",
    level: "SS 1 – SS 3",
    weights: [
      { label: "CA 1", weight: 20 },
      { label: "CA 2", weight: 20 },
      { label: "Assignment", weight: 10 },
      { label: "Examination", weight: 50 },
    ],
    active: true,
  },
  {
    id: "SCH-003",
    name: "Primary — Continuous Assessment",
    level: "Primary 1 – Primary 6",
    weights: [
      { label: "Class work", weight: 20 },
      { label: "Test", weight: 20 },
      { label: "Examination", weight: 60 },
    ],
    active: false,
  },
];

type Scheme = (typeof SCHEMES)[number];
type CbtStatus = "Scheduled" | "In progress" | "Completed";

function readStored<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function AssessmentPage() {
  const { role: signedInRole } = useRole();
  if (signedInRole === "student") return <StudentLearningPage />;
  const { session, term } = useAcademicContext();
  const [classId, setClassId] = useState("C-JS2A");
  const [subjectCode, setSubjectCode] = useState("MTH");
  const cls = CLASSES.find((c) => c.id === classId)!;
  const subject = SUBJECTS.find((s) => s.code === subjectCode)!;

  const baseBook = useMemo(
    () => GRADE_BOOKS.find((b) => b.level === cls.level && b.arm === cls.arm && b.subject === subject.name),
    [cls.level, cls.arm, subject.name],
  );
  const initialStatus = (baseBook?.status ?? "Draft") as GradeBookStatus;
  const gradeBook = useGradeBook(session, term, classId, subjectCode, cls.level, initialStatus);
  const [rows, setRows] = useState(gradeBook.rows);
  const [bookStatus, setBookStatus] = useState<GradeBookStatus>(gradeBook.status);
  const counts = useGradeBookCounts();
  const moderationQueue = useModerationQueue(session, term);
  const { profileId } = useRole();
  const linkedProfile = getProfile(signedInRole, profileId);
  const role: AssessmentRole = signedInRole === "administrator" ? "Administrator" : signedInRole === "principal" ? "Principal" : signedInRole === "examinations" ? "Examination Officer" : "Teacher";
  const canEditAssessment = signedInRole === "administrator" || signedInRole === "principal" || signedInRole === "teacher";
  const canReviewAssessment = signedInRole === "administrator" || signedInRole === "principal" || signedInRole === "examinations";
  const [assignmentTeacher, setAssignmentTeacher] = useState(STAFF[1]!.id);
  const [assignmentClass, setAssignmentClass] = useState(classId);
  const [assignmentSubject, setAssignmentSubject] = useState(subjectCode);
  const assignments = useAssignments();
  const allStudents = useStudents();
  const [schemes, setSchemes] = useState<Scheme[]>(() => readStored<Scheme[]>("educore.assessment-schemes", SCHEMES).map((scheme) => scheme.weights.some((weight) => weight.label === "CA 1") ? { ...scheme, weights: [{ label: "CA 1", weight: 20 }, { label: "CA 2", weight: 20 }, { label: "Assignment", weight: 10 }, { label: "Examination", weight: 50 }] } : scheme));
  const [cbtSessions, setCbtSessions] = useState<typeof CBT_SESSIONS>(() => readStored("educore.cbt-sessions", CBT_SESSIONS));
  const [schemeDialogOpen, setSchemeDialogOpen] = useState(false);
  const [schemeName, setSchemeName] = useState("");
  const [schemeLevel, setSchemeLevel] = useState("JSS 1 – JSS 3");
  const [manageCbt, setManageCbt] = useState<(typeof CBT_SESSIONS)[number] | null>(null);

  useEffect(() => { window.localStorage.setItem("educore.assessment-schemes", JSON.stringify(schemes)); }, [schemes]);
  useEffect(() => { window.localStorage.setItem("educore.cbt-sessions", JSON.stringify(cbtSessions)); }, [cbtSessions]);

  useEffect(() => {
    setRows(gradeBook.rows);
    setBookStatus(gradeBook.status);
  }, [gradeBook]);

  const draftCount = counts.Draft;
  const submittedCount = counts.Submitted;
  const publishedCount = counts.Published;
  const activeCbt = cbtSessions.filter((s) => s.status === "In progress").length;

  const classAverage = useMemo(() => {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((a, r) => a + total(r), 0) / rows.length);
  }, [rows]);

  const updateMark = (studentId: string, field: keyof typeof rows[number], value: string) => {
    const currentRow = rows.find((row) => row.student.id === studentId);
    if (!currentRow || field === "student") return;
    const max = field === "assignment" ? 10 : field === "exam" ? Math.min(50, 100 - currentRow.ca1 - currentRow.ca2 - currentRow.assignment) : 20;
    const num = Math.min(max, Math.max(0, Number(value) || 0));
    const nextRows = rows.map((r) => r.student.id === studentId ? { ...r, [field]: num } : r);
    setRows(nextRows);
    saveGradeBook(session, term, classId, subjectCode, { rows: nextRows, status: "Draft", updatedAt: new Date().toISOString() });
    recordGradeBookAudit({ action: `Mark updated: ${field}`, actor: role, scope: `${classId} · ${subjectCode} · ${studentId}` });
  };

  const exportGradeBook = () => {
    const data = rows.map((row) => ({
      "Student ID": row.student.id,
      "Admission No": row.student.admissionNo,
      Student: fullName(row.student),
      "CA 1": row.ca1,
      "CA 2": row.ca2,
      Assignment: row.assignment,
      Examination: row.exam,
      Total: total(row),
    }));
    const headers = Object.keys(data[0] ?? {});
    const csv = [headers, ...data.map((row) => headers.map((header) => row[header as keyof typeof row]))]
      .map((line) => line.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = `educore-${session}-${term}-${cls.level}${cls.arm}-${subject.code}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Gradebook exported to CSV");
  };

  const importGradeBook = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const lines = String(reader.result).split(/\r?\n/).filter(Boolean);
          const parseLine = (line: string) => line.match(/"(?:""|[^"])*"|[^,]*/g)?.filter((value) => value !== ",").map((value) => value.startsWith('"') ? value.slice(1, -1).replaceAll('""', '"') : value) ?? [];
          const headers = parseLine(lines.shift() ?? "");
          if (!headers.includes("Student ID") && !headers.includes("Admission No")) throw new Error("CSV headers are invalid");
          const imported = lines.map((line) => Object.fromEntries(parseLine(line).map((value, index) => [headers[index], value])));
          const byId = new Map(rows.map((row) => [row.student.id, row.student.id]));
          const byAdmission = new Map(rows.map((row) => [row.student.admissionNo, row.student.id]));
          let updated = 0;
          const nextRows = rows.map((row) => {
            const importedRow = imported.find((item) => byId.has(String(item["Student ID"] ?? "")) && String(item["Student ID"]) === row.student.id) ?? imported.find((item) => byAdmission.has(String(item["Admission No"] ?? "")) && String(item["Admission No"]) === row.student.admissionNo);
            if (!importedRow) return row;
            const ca1 = Math.min(20, Math.max(0, Number(importedRow["CA 1"]) || 0));
            const ca2 = Math.min(20, Math.max(0, Number(importedRow["CA 2"]) || 0));
            const assignment = Math.min(10, Math.max(0, Number(importedRow["Assignment"]) || 0));
            const exam = Math.min(50, Math.max(0, Number(importedRow["Examination"]) || 0));
            updated += 1;
            return { ...row, ca1, ca2, assignment, exam };
          });
          setRows(nextRows);
          saveGradeBook(session, term, classId, subjectCode, { rows: nextRows, status: "Draft", updatedAt: new Date().toISOString() });
          recordGradeBookAudit({ action: "Gradebook imported from CSV", actor: role, scope: `${classId} · ${subjectCode}` });
          toast.success(`${updated} gradebook record${updated === 1 ? "" : "s"} imported`);
        } catch {
          toast.error("CSV file could not be imported", { description: "Use a CSV exported from EduCore or match Student ID and mark column names." });
        }
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  };

  const assigned = isAssigned(role, classId, subjectCode);
  const canPublish = role !== "Teacher" && bookStatus === "Approved";
  const canApprove = role !== "Teacher" && bookStatus === "Submitted";
  const canSubmit = signedInRole === "teacher" && (bookStatus === "Draft" || bookStatus === "Correction requested");
  const readOnly = bookStatus === "Published" || !assigned || !canEditAssessment;
  const visibleRows = signedInRole === "parent" ? rows.filter((row) => linkedProfile?.childIds.includes(row.student.id) && (bookStatus === "Published" || bookStatus === "Correction requested")) : rows;

  return (
    <AppShell>
      <PageHeader
        title="Assessment & Grade Book"
        description="Configure assessment schemes, enter marks, run CBT sessions and publish results with a full audit trail."
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Assessment & Grade Book" }]}
        actions={
          <>
            <Select value={role} disabled>
              <SelectTrigger className="h-8 w-40 text-xs" aria-label="Assessment view role"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="Administrator">Administrator view</SelectItem><SelectItem value="Teacher">Teacher view</SelectItem><SelectItem value="Principal">Principal view</SelectItem></SelectContent>
            </Select>
            {canEditAssessment && <Button variant="outline" size="sm" onClick={() => toast.info("Assessment scheme builder opened")}>
              <FilePenLine className="size-4" /> New scheme
            </Button>}
            <Button size="sm" disabled={!canPublish} onClick={() => { const published = { rows, status: "Published" as const, updatedAt: new Date().toISOString() }; setBookStatus("Published"); saveGradeBook(session, term, classId, subjectCode, published); recordResultPublication(session, term, classId, subjectCode, published); recordGradeBookAudit({ action: "Gradebook published", actor: role, scope: `${classId} · ${subjectCode}` }); toast.success("Grade book published to parents and students"); }}>
              <Send className="size-4" /> Publish results
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Grade books in draft" value={`${draftCount}`} sub="Need marks entry or review" icon={FilePenLine} tone={draftCount ? "warning" : "default"} />
        <KpiCard label="Submitted for approval" value={`${submittedCount}`} sub="Awaiting principal or admin sign-off" icon={FileCheck} tone={submittedCount ? "warning" : "default"} />
        <KpiCard label="Published this term" value={`${publishedCount}`} sub="Visible to guardians and students" icon={BookOpenCheck} />
        <KpiCard label="CBT sessions active" value={`${activeCbt}`} sub="Students taking tests now" icon={MonitorPlay} tone={activeCbt ? "warning" : "default"} />
      </div>

      <Tabs defaultValue="gradebook" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="gradebook">Grade book</TabsTrigger>
          <TabsTrigger value="schemes">Assessment schemes</TabsTrigger>
          <TabsTrigger value="cbt">CBT sessions</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          {canReviewAssessment && <TabsTrigger value="moderation">Moderation queue{moderationQueue.length > 0 ? ` (${moderationQueue.length})` : ""}</TabsTrigger>}
          {role !== "Teacher" && <TabsTrigger value="assignments">Teacher assignments</TabsTrigger>}
        </TabsList>

        {canReviewAssessment && <TabsContent value="moderation" className="mt-4 space-y-4">
          <SectionCard title="Submitted grade books" description={`${session} · ${term} · Review component scores before approval`} bodyClassName="p-0">
            {moderationQueue.length === 0 ? <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto size-8 text-success" /><p className="mt-2 text-sm font-semibold">No grade books awaiting moderation</p><p className="mt-1 text-sm text-muted-foreground">Submitted teacher grade books will appear here for review.</p></div> : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-5 py-2.5 text-left font-medium">Grade book</th><th className="px-3 py-2.5 text-left font-medium">Teacher</th><th className="px-3 py-2.5 text-right font-medium">Students</th><th className="px-3 py-2.5 text-right font-medium">Average</th><th className="px-3 py-2.5 text-right font-medium">Exceptions</th><th className="px-5 py-2.5 text-right font-medium">Action</th></tr></thead>
                <tbody>{moderationQueue.map((item) => { const average = item.record.rows.length ? Math.round(item.record.rows.reduce((sum, row) => sum + total(row), 0) / item.record.rows.length) : 0; return <tr key={`${item.classId}-${item.subjectCode}`} className="border-t border-border"><td className="px-5 py-3"><p className="font-medium">{item.subjectName} · {item.level} {item.arm}</p><p className="text-xs text-muted-foreground">Updated {new Date(item.record.updatedAt).toLocaleDateString("en-NG")}</p></td><td className="px-3 py-3 text-muted-foreground">{item.teacher}</td><td className="tabular px-3 py-3 text-right">{item.record.rows.length}</td><td className="tabular px-3 py-3 text-right font-semibold">{average}%</td><td className="px-3 py-3 text-right">{item.exceptionCount > 0 ? <StatusBadge tone="warning" dot={false}>{item.exceptionCount} below 40%</StatusBadge> : <StatusBadge tone="success" dot={false}>None</StatusBadge>}</td><td className="px-5 py-3 text-right"><div className="flex justify-end gap-2"><Button size="sm" onClick={() => { reviewGradeBook(session, term, item.classId, item.subjectCode, item.record, "Approved", role); recordGradeBookAudit({ action: "Gradebook approved", actor: role, scope: `${item.classId} · ${item.subjectCode}` }); toast.success(`${item.subjectName} approved for publishing`); }}>Approve</Button><Button variant="outline" size="sm" onClick={() => { const note = window.prompt("Why does this grade book need correction?"); if (!note?.trim()) return; reviewGradeBook(session, term, item.classId, item.subjectCode, item.record, "Correction requested", role, note.trim()); recordGradeBookAudit({ action: "Correction requested", actor: role, scope: `${item.classId} · ${item.subjectCode}` }); toast.success("Correction requested from teacher"); }}>Request correction</Button></div></td></tr>; })}</tbody>
              </table>
            </div>}
          </SectionCard>
        </TabsContent>}

        <TabsContent value="gradebook" className="mt-4 space-y-4">
          <SectionCard
            title={`${subject.name} — ${cls.level} ${cls.arm}`}
            description="Enter continuous assessment and examination marks. Totals and grades update automatically."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.level} {c.arm} · {c.formTeacher}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={subjectCode} onValueChange={setSubjectCode}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={importGradeBook}><FileUp className="size-4" /> Import CSV</Button>
                <Button variant="outline" size="sm" onClick={exportGradeBook}><Download className="size-4" /> Export CSV</Button>
              </div>
            }
            bodyClassName="p-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="flex items-center gap-3">
                <StatusBadge tone={gradeBookTone(bookStatus)}>{bookStatus}</StatusBadge>
                {!assigned && <StatusBadge tone="danger">Not assigned</StatusBadge>}
                <span className="text-xs text-muted-foreground">Teacher: {subject.teacher}</span>
                <span className="text-xs text-muted-foreground">Updated: {baseBook?.updated ?? "Today"}</span>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && role !== "Teacher" && (
                  <Button variant="outline" size="sm" onClick={() => { setBookStatus("Draft"); saveGradeBook(session, term, classId, subjectCode, { rows, status: "Draft", updatedAt: new Date().toISOString() }); toast.success("Draft saved"); }}>
                    <Save className="size-4" /> Save draft
                  </Button>
                )}
                {canSubmit && (
                  <Button size="sm" onClick={() => { setBookStatus("Submitted"); saveGradeBook(session, term, classId, subjectCode, { rows, status: "Submitted", updatedAt: new Date().toISOString() }); recordGradeBookAudit({ action: "Gradebook submitted for approval", actor: role, scope: `${classId} · ${subjectCode}` }); toast.success("Grade book submitted for approval"); }}>
                    <Send className="size-4" /> Submit for approval
                  </Button>
                )}
                {canApprove && (
                  <Button size="sm" onClick={() => { reviewGradeBook(session, term, classId, subjectCode, { rows, status: bookStatus, updatedAt: new Date().toISOString() }, "Approved", role); recordGradeBookAudit({ action: "Gradebook approved", actor: role, scope: `${classId} · ${subjectCode}` }); setBookStatus("Approved"); toast.success("Grade book approved for publishing"); }}>
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                )}
                {canPublish && (
                  <Button size="sm" onClick={() => { const published = { rows, status: "Published" as const, updatedAt: new Date().toISOString() }; setBookStatus("Published"); saveGradeBook(session, term, classId, subjectCode, published); recordResultPublication(session, term, classId, subjectCode, published); recordGradeBookAudit({ action: "Gradebook published", actor: role, scope: `${classId} · ${subjectCode}` }); toast.success("Grade book published"); }}>
                    <CheckCircle2 className="size-4" /> Publish
                  </Button>
                )}
                {role !== "Teacher" && (bookStatus === "Submitted" || bookStatus === "Approved") && (
                  <Button size="sm" variant="outline" onClick={() => { const note = window.prompt("Why does this grade book need correction?"); if (!note?.trim()) return; reviewGradeBook(session, term, classId, subjectCode, { rows, status: bookStatus, updatedAt: new Date().toISOString() }, "Correction requested", role, note.trim()); recordGradeBookAudit({ action: "Correction requested", actor: role, scope: `${classId} · ${subjectCode}` }); setBookStatus("Correction requested"); toast.success("Correction requested from teacher"); }}>
                    Request correction
                  </Button>
                )}
              </div>
            </div>
            {gradeBook.moderation && (
              <div className="border-b border-border bg-muted/30 px-5 py-2.5 text-xs">
                <span className="font-medium">Moderation: {gradeBook.moderation.decision}</span>
                <span className="text-muted-foreground"> · {gradeBook.moderation.reviewedBy} · {new Date(gradeBook.moderation.reviewedAt).toLocaleString("en-NG")}</span>
                {gradeBook.moderation.note && <p className="mt-1 text-muted-foreground">Reason: {gradeBook.moderation.note}</p>}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-6 border-b border-border bg-muted/30 px-5 py-2.5 text-xs">
              <span className="text-muted-foreground">Class average</span>
              <span className="tabular font-semibold">{classAverage}%</span>
              <div className="flex w-32 items-center gap-2">
                <Progress value={classAverage} className="h-1.5" />
              </div>
                <span className="ml-auto text-muted-foreground">{visibleRows.length} students</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Student</th>
                    <th className="px-2 py-2.5 text-center font-medium">CA 1</th>
                    <th className="px-2 py-2.5 text-center font-medium">CA 2</th>
                    <th className="px-2 py-2.5 text-center font-medium">Assignment</th>
                    <th className="px-2 py-2.5 text-center font-medium">Exam</th>
                    <th className="px-3 py-2.5 text-center font-medium">Total</th>
                    <th className="px-3 py-2.5 text-center font-medium">Grade</th>
                    <th className="px-5 py-2.5 text-left font-medium">Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const score = total(r);
                    const grade = waecGrade(score);
                    return (
                      <tr key={r.student.id} className="border-t border-border">
                        <td className="px-5 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                              {initials(fullName(r.student))}
                            </span>
                            <span>
                              <span className="block font-medium">{fullName(r.student)}</span>
                              <span className="tabular text-[11px] text-muted-foreground">{r.student.id}</span>
                            </span>
                          </span>
                        </td>
                        {(["ca1", "ca2", "assignment", "exam"] as const).map((field) => (
                          <td key={field} className="px-2 py-2.5">
                            <Input
                              type="number"
                              min={0}
                              max={field === "assignment" ? 10 : field === "exam" ? 100 - r.ca1 - r.ca2 - r.assignment : 20}
                              value={r[field]}
                              disabled={readOnly}
                              onChange={(e) => updateMark(r.student.id, field, e.target.value)}
                              className="h-8 min-w-[64px] text-center tabular text-sm"
                            />
                          </td>
                        ))}
                        <td className="tabular px-3 py-2.5 text-center font-semibold">{score}</td>
                        <td className="px-3 py-2.5 text-center">
                          <StatusBadge tone={grade.tone} dot={false}>
                            {grade.grade}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{grade.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {readOnly && (
              <div className="flex items-start gap-2 border-t border-border bg-success-soft/40 px-5 py-3 text-xs text-success">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <p>This grade book is published. Marks are locked and visible to guardians and students.</p>
              </div>
            )}
            {!assigned && <div className="border-t border-border bg-danger-soft/40 px-5 py-3 text-xs text-danger">This teacher is not assigned to this class and subject. An administrator must assign it before marks can be entered.</div>}
          </SectionCard>
        </TabsContent>

        <TabsContent value="schemes" className="mt-4 space-y-4">
          {schemes.map((scheme) => (
            <SectionCard
              key={scheme.id}
              title={scheme.name}
              description={`${scheme.level} · ${scheme.weights.map((w) => `${w.label} ${w.weight}%`).join(" · ")}`}
              action={
                <div className="flex items-center gap-2">
                  {scheme.active && <StatusBadge tone="success">Active</StatusBadge>}
                  <Button variant="outline" size="sm" onClick={() => { setSchemeName(scheme.name); setSchemeLevel(scheme.level); setSchemeDialogOpen(true); }}>
                    Edit scheme
                  </Button>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {scheme.weights.map((w) => (
                    <div key={w.label} className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">{w.label}</p>
                      <p className="text-lg font-semibold tabular">{w.weight}%</p>
                    </div>
                  ))}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  {scheme.weights.reduce(
                    (acc, w, i) => {
                      const prev = scheme.weights.slice(0, i).reduce((s, x) => s + x.weight, 0);
                      const colors = ["bg-teal", "bg-info", "bg-warning", "bg-success"];
                      return (
                        <>
                          {acc}
                          <div
                            key={w.label}
                            className={`h-full ${colors[i % colors.length]}`}
                            style={{ width: `${w.weight}%`, marginLeft: `${prev}%` }}
                          />
                        </>
                      );
                    },
                    <></>,
                  )}
                </div>
              </div>
            </SectionCard>
          ))}
          <Button size="sm" onClick={() => { setSchemeName(""); setSchemeLevel("JSS 1 – JSS 3"); setSchemeDialogOpen(true); }}><FilePenLine className="size-4" /> New scheme</Button>
        </TabsContent>

        <TabsContent value="cbt" className="mt-4 space-y-4">
          <SectionCard title="CBT sessions" description="Computer-based tests, mock exams and practice papers." bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Session</th>
                    <th className="px-3 py-2.5 text-left font-medium">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium">Questions</th>
                    <th className="px-3 py-2.5 text-left font-medium">Duration</th>
                    <th className="px-3 py-2.5 text-left font-medium">Progress</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-5 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cbtSessions.map((s) => {
                    const progress = s.candidates ? Math.round((s.submitted / s.candidates) * 100) : 0;
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <MonitorPlay className="size-4 text-muted-foreground" aria-hidden />
                            <div>
                              <p className="font-medium">{s.title}</p>
                              <p className="tabular text-[11px] text-muted-foreground">{s.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">{s.date}</td>
                        <td className="tabular px-3 py-2.5 text-muted-foreground">{s.questions}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{s.duration}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex w-28 items-center gap-2">
                            <Progress value={progress} className="h-1.5" />
                            <span className="tabular text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={s.status === "Completed" ? "success" : s.status === "In progress" ? "warning" : "info"}>
                            {s.status}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          <Button variant="outline" size="sm" onClick={() => setManageCbt(s)}>
                            Manage
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <Dialog open={manageCbt !== null} onOpenChange={(open) => { if (!open) setManageCbt(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Manage CBT session</DialogTitle><DialogDescription>Update the operational state of this computer-based test.</DialogDescription></DialogHeader>
              {manageCbt && <div className="space-y-4"><div><p className="text-sm font-semibold">{manageCbt.title}</p><p className="text-xs text-muted-foreground">{manageCbt.questions} questions · {manageCbt.duration} · {getCbtRegistrations(manageCbt.id).length || 0} registered candidates</p></div><Select value={manageCbt.status} onValueChange={(status) => setManageCbt({ ...manageCbt, status: status as CbtStatus })}><SelectTrigger aria-label="CBT status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Scheduled">Scheduled</SelectItem><SelectItem value="In progress">In progress</SelectItem><SelectItem value="Completed">Completed</SelectItem></SelectContent></Select><Button variant="outline" onClick={() => { const registered = registerCbtCandidates(manageCbt.id, allStudents.filter((student) => manageCbt.title.includes(student.level))); setManageCbt({ ...manageCbt, candidates: registered }); toast.success(`${registered} candidates registered for this session`); }}>Register matching class candidates</Button></div>}
              <DialogFooter><Button variant="outline" onClick={() => setManageCbt(null)}>Cancel</Button><Button onClick={() => { if (!manageCbt) return; setCbtSessions((sessions) => sessions.map((session) => session.id === manageCbt.id ? manageCbt : session)); setManageCbt(null); toast.success("CBT session updated"); }}>Save session</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          <SectionCard title="Term results" description={`${session} · ${term} · Published report sheets and transcripts`}>
            <div className="space-y-3">
              {getPublishedGradeBooks(session, term).length > 0 ? getPublishedGradeBooks(session, term).map(({ classId: publishedClassId, subjectCode: publishedSubjectCode, record }) => <div key={`${publishedClassId}-${publishedSubjectCode}`} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-4 py-3 text-sm"><span className="font-medium">{SUBJECTS.find((item) => item.code === publishedSubjectCode)?.name}</span><span className="text-muted-foreground">{CLASSES.find((item) => item.id === publishedClassId)?.level} {CLASSES.find((item) => item.id === publishedClassId)?.arm}</span><span className="text-muted-foreground">{record.rows.length} students graded</span><StatusBadge tone="success" className="ml-auto">Published</StatusBadge></div>) : <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                <GraduationCap className="size-5" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold">No results published yet</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Publish a grade book from the Grade book tab to generate student report sheets and transcripts.
              </p>
              <Button className="mt-2" size="sm" onClick={() => toast.info("Switch to the Grade book tab to publish")}>
                Go to grade book
              </Button>
              </div>}
            </div>
          </SectionCard>
        </TabsContent>

        {role !== "Teacher" && <TabsContent value="assignments" className="mt-4 space-y-4">
          <SectionCard title="Teacher and class assignments" description="Administrators control which teacher can enter each subject grade book.">
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
              <Select value={assignmentTeacher} onValueChange={setAssignmentTeacher}><SelectTrigger aria-label="Teacher"><SelectValue /></SelectTrigger><SelectContent>{STAFF.filter((staff) => staff.role.toLowerCase().includes("teacher")).map((staff) => <SelectItem key={staff.id} value={staff.id}>{staff.name}</SelectItem>)}</SelectContent></Select>
              <Select value={assignmentClass} onValueChange={setAssignmentClass}><SelectTrigger aria-label="Class"><SelectValue /></SelectTrigger><SelectContent>{CLASSES.map((item) => <SelectItem key={item.id} value={item.id}>{item.level} {item.arm}</SelectItem>)}</SelectContent></Select>
              <Select value={assignmentSubject} onValueChange={setAssignmentSubject}><SelectTrigger aria-label="Subject"><SelectValue /></SelectTrigger><SelectContent>{SUBJECTS.map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent></Select>
              <Button onClick={() => { const teacher = STAFF.find((staff) => staff.id === assignmentTeacher)!; assignTeacher({ teacherId: teacher.id, teacherName: teacher.name, classId: assignmentClass, subjectCode: assignmentSubject }); toast.success("Teacher assignment saved"); }}><UserPlus className="size-4" /> Assign</Button>
            </div>
          </SectionCard>
          <SectionCard title="Active assignments" bodyClassName="p-0">
            <ul className="divide-y divide-border">{assignments.map((assignment) => <li key={assignment.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><span className="font-medium">{assignment.teacherName}</span><span className="text-muted-foreground">{CLASSES.find((item) => item.id === assignment.classId)?.level} {CLASSES.find((item) => item.id === assignment.classId)?.arm}</span><span className="text-muted-foreground">{SUBJECTS.find((item) => item.code === assignment.subjectCode)?.name}</span><StatusBadge tone="success" className="ml-auto">Active</StatusBadge></li>)}</ul>
          </SectionCard>
        </TabsContent>}
      </Tabs>
      <Dialog open={schemeDialogOpen} onOpenChange={setSchemeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assessment scheme</DialogTitle><DialogDescription>Define the scheme name and level range used by grade books.</DialogDescription></DialogHeader>
          <div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="scheme-name">Scheme name</Label><Input id="scheme-name" value={schemeName} onChange={(event) => setSchemeName(event.target.value)} placeholder="Senior Secondary assessment" /></div><div className="space-y-1.5"><Label htmlFor="scheme-level">Level range</Label><Input id="scheme-level" value={schemeLevel} onChange={(event) => setSchemeLevel(event.target.value)} /></div><p className="text-xs text-muted-foreground">CA1 and CA2 are capped at 20 marks each, assignment at 10 marks, and examination is independently scored up to 50 marks. The total is the sum of all components.</p></div>
          <DialogFooter><Button variant="outline" onClick={() => setSchemeDialogOpen(false)}>Cancel</Button><Button disabled={!schemeName.trim()} onClick={() => { setSchemes((current) => [...current, { id: `SCH-${Date.now()}`, name: schemeName.trim(), level: schemeLevel.trim(), weights: [{ label: "CA 1", weight: 20 }, { label: "CA 2", weight: 20 }, { label: "Assignment", weight: 10 }, { label: "Examination", weight: 50 }], active: false }]); setSchemeDialogOpen(false); toast.success("Assessment scheme saved"); }}>Save scheme</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

type StudentAssignment = { id: string; title: string; subject: string; due: string; instructions: string };
type AssignmentSubmission = { assignmentId: string; status: "Draft" | "Queued offline" | "Submitted"; fileName?: string; fileSize?: number; submittedAt?: string };
type CbtQuestion = { prompt: string; options: string[]; answer: number };

const STUDENT_ASSIGNMENTS: StudentAssignment[] = [
  { id: "ASM-001", title: "Simultaneous equations worksheet", subject: "Mathematics", due: "2026-08-29", instructions: "Solve each equation and show the elimination steps in your working." },
  { id: "ASM-002", title: "Reading comprehension response", subject: "English Language", due: "2026-09-01", instructions: "Read the passage provided in class and submit your structured response." },
];
const CBT_QUESTIONS: CbtQuestion[] = [
  { prompt: "What is the value of 3x when x = 4?", options: ["7", "12", "16", "1"], answer: 1 },
  { prompt: "Which gas do green plants release during photosynthesis?", options: ["Nitrogen", "Carbon dioxide", "Oxygen", "Hydrogen"], answer: 2 },
  { prompt: "Which word is closest in meaning to 'rapid'?", options: ["Slow", "Quick", "Quiet", "Late"], answer: 1 },
  { prompt: "What is the first stage of a scientific investigation?", options: ["Observation", "Conclusion", "Publication", "Guessing"], answer: 0 },
  { prompt: "How many sides does a hexagon have?", options: ["Five", "Six", "Seven", "Eight"], answer: 1 },
];

function StudentLearningPage() {
  const { profileId } = useRole();
  const { session, term } = useAcademicContext();
  const student = useStudents().find((item) => item.id === getProfile("student", profileId)?.childIds[0]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>(() => readStored("educore.student-submissions", []));
  const [selectedFile, setSelectedFile] = useState<{ assignmentId: string; name: string; size: number } | null>(null);
  const [activeCbt, setActiveCbt] = useState<{ id: string; title: string; mode: "Practice" | "School CBT" } | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [attempts, setAttempts] = useState<CbtAttempt[]>([]);
  const [lastResult, setLastResult] = useState<CbtAttempt | null>(null);
  const publishedResults = student ? getPublishedRowsForStudent(student.id, session, term) : [];
  const studentClass = student ? CLASSES.find((item) => item.level === student.level && item.arm === student.arm) : undefined;
  const persistSubmissions = (next: AssignmentSubmission[]) => { setSubmissions(next); window.localStorage.setItem("educore.student-submissions", JSON.stringify(next)); };
  useEffect(() => { if (student) setAttempts(getCbtAttempts().filter((attempt) => attempt.studentId === student.id)); }, [student]);
  const saveSubmission = (assignmentId: string, status: AssignmentSubmission["status"]) => {
    if (!student || !selectedFile || selectedFile.assignmentId !== assignmentId) { toast.error("Attach a file before saving this submission"); return; }
    const submission: AssignmentSubmission = { assignmentId, status, fileName: selectedFile.name, fileSize: selectedFile.size, ...(status === "Submitted" ? { submittedAt: new Date().toISOString() } : {}) };
    persistSubmissions([...submissions.filter((item) => item.assignmentId !== assignmentId), submission]);
    setSelectedFile(null);
    toast.success(status === "Submitted" ? "Assignment submitted" : "Assignment saved offline");
  };
  const syncSubmissions = () => {
    if (!navigator.onLine) { toast.error("You are offline. Keep the submission queued until connectivity returns."); return; }
    const next = submissions.map((item) => item.status === "Queued offline" ? { ...item, status: "Submitted" as const, submittedAt: new Date().toISOString() } : item);
    persistSubmissions(next); toast.success("Queued assignment submissions synced");
  };
  const beginCbt = (id: string, title: string, mode: "Practice" | "School CBT") => {
    if (mode === "School CBT" && (!student || !isCbtCandidate(id, student.id))) { toast.error("You are not registered for this school CBT session"); return; }
    setActiveCbt({ id, title, mode }); setQuestionIndex(0); setAnswers({}); setLastResult(null);
  };
  const submitCbt = () => {
    if (!student || !activeCbt) return;
    const score = CBT_QUESTIONS.reduce((sum, question, index) => sum + (answers[index] === question.answer ? 1 : 0), 0);
    const result: CbtAttempt = { sessionId: activeCbt.id, studentId: student.id, score, total: CBT_QUESTIONS.length, submittedAt: new Date().toISOString(), mode: activeCbt.mode };
    saveCbtAttempt(result); setAttempts((current) => [...current, result]); setLastResult(result); setActiveCbt(null); toast.success(`${activeCbt.mode} submitted: ${score}/${CBT_QUESTIONS.length}`);
    if (activeCbt.mode === "School CBT") {
      const classForStudent = CLASSES.find((item) => item.level === student.level && item.arm === student.arm);
      const subjectForCbt = SUBJECTS.find((item) => activeCbt.title.toLowerCase().includes(item.name.toLowerCase()));
      if (classForStudent && subjectForCbt && recordCbtExamScore(session, term, classForStudent.id, subjectForCbt.code, student.level, student.id, score, CBT_QUESTIONS.length)) {
        recordGradeBookAudit({ action: "School CBT examination score recorded", actor: "School CBT", scope: `${classForStudent.id} · ${subjectForCbt.code} · ${student.id}` });
        toast.success("School CBT score added to the examination column");
      }
    }
  };
  if (!student) return <AppShell><SectionCard title="Student account not linked"><p className="text-sm text-muted-foreground">Your student profile is not linked to this account. Contact the school administrator.</p></SectionCard></AppShell>;
  if (activeCbt) { const question = CBT_QUESTIONS[questionIndex]!; return <AppShell><PageHeader title={activeCbt.title} description={`${activeCbt.mode} · Question ${questionIndex + 1} of ${CBT_QUESTIONS.length}`} breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Student learning" }, { label: activeCbt.title }]} /><SectionCard title={question.prompt} description="Select one answer. Your progress is saved in this session." className="mt-6"><div className="space-y-3">{question.options.map((option, index) => <button key={option} type="button" className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-sm ${answers[questionIndex] === index ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`} onClick={() => setAnswers((current) => ({ ...current, [questionIndex]: index }))}><span className="flex size-6 items-center justify-center rounded-full border text-xs">{String.fromCharCode(65 + index)}</span>{option}</button>)}</div><div className="mt-6 flex justify-between"><Button variant="outline" disabled={questionIndex === 0} onClick={() => setQuestionIndex((current) => current - 1)}>Previous</Button>{questionIndex === CBT_QUESTIONS.length - 1 ? <Button onClick={submitCbt}>Submit attempt</Button> : <Button onClick={() => setQuestionIndex((current) => current + 1)}>Next question</Button>}</div></SectionCard></AppShell>; }
  return <AppShell><PageHeader title="Student learning" description={`${student.firstName} ${student.lastName} · ${student.level} ${student.arm} · ${session} · ${term}`} breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Student learning" }]} /><Tabs defaultValue="assignments" className="mt-6"><TabsList><TabsTrigger value="assignments">Assignments</TabsTrigger><TabsTrigger value="cbt">CBT & practice</TabsTrigger><TabsTrigger value="results">My results</TabsTrigger></TabsList><TabsContent value="assignments" className="mt-4 space-y-4"><SectionCard title="Assignments" description="Attach a document, save work offline, or submit when connected.">{STUDENT_ASSIGNMENTS.map((assignment) => { const submission = submissions.find((item) => item.assignmentId === assignment.id); return <div key={assignment.id} className="rounded-md border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{assignment.title}</p><p className="text-xs text-muted-foreground">{assignment.subject} · Due {assignment.due}</p></div><StatusBadge tone={submission?.status === "Submitted" ? "success" : submission?.status === "Queued offline" ? "warning" : "neutral"}>{submission?.status ?? "Not started"}</StatusBadge></div><p className="mt-3 text-sm text-muted-foreground">{assignment.instructions}</p><div className="mt-4 flex flex-wrap items-center gap-2"><Label htmlFor={`file-${assignment.id}`} className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs"><FileUp className="size-4" /> {submission?.fileName ?? "Attach document"}</Label><Input id={`file-${assignment.id}`} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={(event) => { const file = event.target.files?.[0]; if (file) setSelectedFile({ assignmentId: assignment.id, name: file.name, size: file.size }); }} />{selectedFile?.assignmentId === assignment.id && <span className="text-xs text-muted-foreground">{selectedFile.name}</span>}<Button size="sm" variant="outline" onClick={() => saveSubmission(assignment.id, "Draft")}>Save offline</Button><Button size="sm" onClick={() => saveSubmission(assignment.id, navigator.onLine ? "Submitted" : "Queued offline")}>Submit assignment</Button></div></div>; })}<Button variant="outline" onClick={syncSubmissions}>Sync queued submissions</Button></SectionCard></TabsContent><TabsContent value="cbt" className="mt-4 space-y-4"><SectionCard title="Practice CBT" description="Use practice mode to learn the CBT interface without affecting school results." action={<Button size="sm" onClick={() => beginCbt("PRACTICE-GENERAL", "General practice CBT", "Practice")}><PlayCircle className="size-4" /> Start practice</Button>}><p className="text-sm text-muted-foreground">Five mixed curriculum questions with immediate attempt scoring.</p></SectionCard><SectionCard title="School CBT examinations" description="Only scheduled or in-progress school sessions are available for entry." bodyClassName="p-0"><div className="divide-y divide-border">{CBT_SESSIONS.filter((item) => item.status !== "Completed").map((exam) => <div key={exam.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium">{exam.title}</p><p className="text-xs text-muted-foreground">{exam.questions} questions · {exam.duration} · {exam.date}</p></div><div className="flex items-center gap-3"><StatusBadge tone={exam.status === "In progress" ? "success" : "info"}>{exam.status}</StatusBadge><Button size="sm" disabled={exam.status === "Scheduled" && exam.date > new Date().toISOString().slice(0, 10)} onClick={() => beginCbt(exam.id, exam.title, "School CBT")}>{exam.status === "In progress" ? "Enter exam" : "Preview"}</Button></div></div>)}</div></SectionCard>{attempts.filter((attempt) => attempt.studentId === student.id).map((attempt) => <div key={`${attempt.sessionId}-${attempt.submittedAt}`} className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-4 py-3 text-sm"><span>{attempt.mode} · {attempt.sessionId}</span><span className="font-semibold tabular">{attempt.score}/{attempt.total}</span></div>)}</TabsContent><TabsContent value="results" className="mt-4"><SectionCard title="Published results" description="Only results published for your student record are shown.">{publishedResults.length ? <div className="divide-y divide-border rounded-md border border-border">{publishedResults.map((result) => <div key={`${result.subjectName}-${result.student.id}`} className="flex items-center justify-between px-4 py-3 text-sm"><span>{result.subjectName}</span><span className="font-semibold tabular">{total(result)} · {waecGrade(total(result)).grade}</span></div>)}</div> : <p className="py-10 text-center text-sm text-muted-foreground">No published results for this term yet.</p>}{lastResult && <p className="mt-4 text-sm text-success">Latest CBT attempt: {lastResult.score}/{lastResult.total}</p>}</SectionCard></TabsContent></Tabs></AppShell>;
}
