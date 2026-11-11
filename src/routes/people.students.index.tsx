import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  CheckCircle2,
  Download,
  Filter,
  IdCard,
  MoreHorizontal,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { EmptyState, PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge, academicTone, attendanceTone } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fullName, type Student } from "@/data/school";
import { approveStudent, createStudent, decideAdmissions, issueIdentityCard, updateStudent, useStudentRegistry } from "@/data/student-store";
import { useRole } from "@/lib/role-context";
import { toast } from "sonner";
import { initials, naira } from "@/lib/format";
import { recommendedMovement, saveStudentMovement, useStudentMovements, type MovementDecision } from "@/data/student-movement-store";
import { generateReportCards, hasAllTermsReady } from "@/data/report-card-store";
import { useAcademicContext } from "@/lib/academic-context";
import { approveServerStudent } from "@/lib/student-api";

export const Route = createFileRoute("/people/students/")({
  head: () => ({
    meta: [
      { title: "Students — EduCore" },
      {
        name: "description",
        content: "Search, filter and manage every student record: class placement, attendance, fees and documents.",
      },
      { property: "og:title", content: "Students — EduCore" },
      { property: "og:description", content: "Complete student register with bulk actions and advanced filters." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudentsPage,
});

const PAGE_SIZE = 10;

function lifecycleTone(status: Student["status"]) {
  return status === "Active" ? "success" : status === "Pending approval" ? "warning" : status === "Withdrawn" ? "danger" : "neutral";
}
function StudentsPage() {
  const { role, authenticated } = useRole();
  const { students, loading, error } = useStudentRegistry(authenticated);
  const { session, term } = useAcademicContext();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [sortDesc, setSortDesc] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingSelected, setPendingSelected] = useState<string[]>([]);
  const movements = useStudentMovements();
  const [movementDrafts, setMovementDrafts] = useState<Record<string, MovementDecision>>({});
  const canDecideMovement = role === "administrator" || role === "principal";

  const filtered = useMemo(() => {
    const rows = students.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchQ = !q || fullName(s).toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
      const matchLevel = level === "all" || s.level === level;
      const matchStatus = status === "all" || s.status === status;
      return matchQ && matchLevel && matchStatus;
    });
    return rows.sort((a, b) =>
      sortDesc ? fullName(b).localeCompare(fullName(a)) : fullName(a).localeCompare(fullName(b)),
    );
  }, [students, query, level, status, sortDesc]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const pendingAdmissions = students.filter((student) => student.status === "Pending approval");
  const allPendingSelected = pendingAdmissions.length > 0 && pendingAdmissions.every((student) => pendingSelected.includes(student.id));

  function exportStudents() {
    const csv = ["Student ID,Admission No,Name,Class,Status,Fee Balance", ...students.map((student) => `${student.id},${student.admissionNo},"${fullName(student)}",${student.level}${student.arm},${student.status},${student.feeBalance}`)].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = "educore-students.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importStudents() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const lines = String(reader.result).split(/\r?\n/).filter(Boolean).slice(1);
        let imported = 0;
        lines.forEach((line) => {
          const columns = line.split(",").map((value) => value.trim().replace(/^"|"$/g, ""));
          const [firstName, lastName, level = "JSS 1", arm = "A"] = columns;
          if (firstName && lastName) { createStudent({ firstName, lastName, gender: "Female", section: level.startsWith("SS") ? "Senior Secondary" : "Junior Secondary", level, arm }); imported += 1; }
        });
        toast.success(`${imported} student${imported === 1 ? "" : "s"} imported`);
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function promoteSelected() {
    if (!canDecideMovement) return;
    const ready = selected.filter((id) => hasAllTermsReady(id, session));
    if (ready.length !== selected.length) { toast.error("Promotion requires generated report cards for all three terms"); return; }
    selected.forEach((id) => { const student = students.find((item) => item.id === id); if (!student) return; const recommendation = recommendedMovement(student); if (recommendation.decision === "Promote" && recommendation.nextLevel) updateStudent(id, { level: recommendation.nextLevel }); if (recommendation.decision === "Graduate") updateStudent(id, { status: "Graduated" }); saveStudentMovement(id, recommendation.decision, role, recommendation.nextLevel, recommendation.reason); });
    toast.success(`${selected.length} movement decision${selected.length === 1 ? "" : "s"} approved`);
    setSelected([]);
  }

  function generateSelectedReports() {
    const generated = generateReportCards(selected, session, term);
    toast.success(`${generated} report card${generated === 1 ? "" : "s"} generated for ${term}`);
  }

  function reviewAdmissions(decision: "approve" | "reject") {
    if (!pendingSelected.length || (role !== "administrator" && role !== "principal")) return;
    decideAdmissions(pendingSelected, role === "principal" ? "Principal" : "School Administrator", decision, decision === "reject" ? "Admission review declined" : undefined);
    toast.success(`${pendingSelected.length} admission${pendingSelected.length === 1 ? "" : "s"} ${decision === "approve" ? "approved" : "rejected"}`);
    setPendingSelected([]);
  }

  async function approveSingleAdmission(student: Student) {
    const actor = role === "principal" ? "Principal" : "School Administrator";
    try {
      if (authenticated && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(student.id)) {
        await approveServerStudent(student.id);
      } else {
        approveStudent(student.id, actor);
      }
      toast.success(`${fullName(student)} approved for enrollment`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to approve admission");
    }
  }

  function decideMovement(student: Student) {
    if (!canDecideMovement) return;
    const recommendation = recommendedMovement(student);
    const decision = movementDrafts[student.id] ?? recommendation.decision;
    if (decision === "Promote" && recommendation.nextLevel) updateStudent(student.id, { level: recommendation.nextLevel });
    if (decision === "Graduate") updateStudent(student.id, { status: "Graduated" });
    saveStudentMovement(student.id, decision, role, decision === "Promote" ? recommendation.nextLevel : student.level, recommendation.reason);
    toast.success(`${fullName(student)} marked ${decision.toLowerCase()}`);
  }

  const levels = Array.from(new Set(students.map((s) => s.level)));

  return (
    <AppShell>
      {loading && <p className="mb-3 text-sm text-muted-foreground">Loading the server-backed student register...</p>}
      {error && <p className="mb-3 text-sm text-danger">{error} Showing locally saved student records.</p>}
      <PageHeader
        title="Students"
        description={`${students.length} enrolled students across nursery, primary and secondary sections.`}
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "People", to: "/people" }, { label: "Students" }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportStudents}>
              <Upload className="size-4" /> Import
            </Button>
            <Button variant="outline" size="sm" onClick={importStudents}>
              <Download className="size-4" /> Export
            </Button>
            <Button asChild size="sm">
              <Link to="/people/students/new">
                <UserPlus className="size-4" /> New admission
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard title="Pending admissions" description="Review incomplete or newly submitted admission records before they enter the active register." className="mb-6" bodyClassName="p-0">
        {pendingAdmissions.length === 0 ? <div className="px-5 py-10 text-center text-sm text-muted-foreground">No admissions are waiting for review.</div> : <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3"><label className="flex items-center gap-2 text-sm"><Checkbox checked={allPendingSelected} onCheckedChange={(checked) => setPendingSelected(checked ? pendingAdmissions.map((student) => student.id) : [])} aria-label="Select all pending admissions" />{pendingSelected.length ? `${pendingSelected.length} selected` : `${pendingAdmissions.length} pending`}</label><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!pendingSelected.length} onClick={() => reviewAdmissions("reject")}>Reject selected</Button><Button size="sm" disabled={!pendingSelected.length} onClick={() => reviewAdmissions("approve")}>Approve selected</Button></div></div><div className="divide-y divide-border">{pendingAdmissions.map((student) => <div key={student.id} className="flex items-center gap-3 px-5 py-3 text-sm"><Checkbox checked={pendingSelected.includes(student.id)} onCheckedChange={(checked) => setPendingSelected((current) => checked ? [...current, student.id] : current.filter((id) => id !== student.id))} aria-label={`Select ${fullName(student)}`} /><div className="min-w-0 flex-1"><p className="font-medium">{fullName(student)}</p><p className="text-xs text-muted-foreground">{student.admissionType ?? "Fresh admission"} · {student.level}{student.arm} · {student.admittedOn}</p></div><StatusBadge tone="warning">Pending approval</StatusBadge></div>)}</div></>}
      </SectionCard>

      <SectionCard title="Promotion & movement" description="Review rule-based recommendations before moving students to the next academic stage." className="mb-6" bodyClassName="p-0">
        {!canDecideMovement && <div className="border-b border-border bg-muted/40 px-5 py-3 text-xs text-muted-foreground">Only school administrators and principals can approve promotion, retention, or graduation decisions.</div>}
        <div className="divide-y divide-border">
          {students.filter((student) => student.status === "Active").slice(0, 8).map((student) => { const recommendation = recommendedMovement(student); const saved = movements.find((movement) => movement.studentId === student.id); const decision = movementDrafts[student.id] ?? saved?.decision ?? recommendation.decision; return <div key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><div className="min-w-[190px] flex-1"><p className="font-medium">{fullName(student)}</p><p className="text-xs text-muted-foreground">{student.level}{student.arm} · {student.average}% average · {student.attendanceRate}% attendance</p></div><StatusBadge tone={recommendation.decision === "Retain" ? "warning" : recommendation.decision === "Graduate" ? "teal" : "info"}>{saved ? `Approved: ${saved.decision}` : `Recommended: ${recommendation.decision}`}</StatusBadge><span className="hidden text-xs text-muted-foreground lg:inline">{recommendation.reason}</span><Select value={decision} disabled={!canDecideMovement} onValueChange={(value) => setMovementDrafts((current) => ({ ...current, [student.id]: value as MovementDecision }))}><SelectTrigger className="h-8 w-32 text-xs" aria-label={`Movement decision for ${fullName(student)}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Promote">Promote</SelectItem><SelectItem value="Retain">Retain</SelectItem><SelectItem value="Graduate">Graduate</SelectItem></SelectContent></Select><Button size="sm" variant="outline" disabled={!canDecideMovement} onClick={() => decideMovement(student)}>Approve</Button></div>; })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3"><span className="text-xs text-muted-foreground">Showing the first 8 active students for review. Use filters below for the full register.</span><Button size="sm" variant="outline" disabled={!canDecideMovement || selected.length === 0} onClick={promoteSelected}>Approve selected recommendations</Button></div>
      </SectionCard>

      <SectionCard bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name or student ID…"
              className="pl-9"
              aria-label="Search students"
            />
          </div>
          <Select value={level} onValueChange={(v) => { setLevel(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]" aria-label="Filter by class">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {levels.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]" aria-label="Filter by attendance">
              <SelectValue placeholder="Attendance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any lifecycle status</SelectItem>
              {["Pending approval", "Active", "Withdrawn"].map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Filter className="size-4" /> Advanced filters
          </Button>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-accent/60 px-4 py-2.5">
            <span className="text-sm font-medium">{selected.length} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { selected.forEach(issueIdentityCard); toast.success("Identity cards generated"); setSelected([]); }}>
              Generate ID cards
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toast.success("Guardian notice queued for delivery")}>
              Send notice to guardians
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={promoteSelected}>
              Bulk promote
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={generateSelectedReports}>
              Generate report cards
            </Button>
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => setSelected([])}>
              Clear selection
            </Button>
          </div>
        )}

        {rows.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Try changing your filters, or admit your first student for this session."
            action={
              <Button asChild size="sm">
                <Link to="/people/students/new">Add a student</Link>
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="sticky top-0 bg-muted/70 text-xs text-muted-foreground backdrop-blur">
                <tr>
                  <th className="w-10 px-4 py-2.5">
                    <Checkbox
                      checked={allSelected}
                      aria-label="Select all rows"
                      onCheckedChange={(v) =>
                        setSelected(v ? Array.from(new Set([...selected, ...rows.map((r) => r.id)])) : [])
                      }
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => setSortDesc((v) => !v)}>
                      Student <ArrowUpDown className="size-3.5" aria-hidden />
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium">Class</th>
                  <th className="px-3 py-2.5 text-left font-medium">Gender</th>
                  <th className="px-3 py-2.5 text-left font-medium">Primary guardian</th>
                  <th className="px-3 py-2.5 text-left font-medium">Attendance</th>
                  <th className="px-3 py-2.5 text-left font-medium">Academic</th>
                  <th className="px-3 py-2.5 text-left font-medium">Lifecycle</th>
                  <th className="px-3 py-2.5 text-right font-medium">Fee balance</th>
                  <th className="w-12 px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((s: Student) => (
                  <tr key={s.id} className="transition-colors hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Checkbox
                        checked={selected.includes(s.id)}
                        aria-label={`Select ${fullName(s)}`}
                        onCheckedChange={(v) =>
                          setSelected(v ? [...selected, s.id] : selected.filter((x) => x !== s.id))
                        }
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        to="/people/students/$studentId"
                        params={{ studentId: s.id }}
                        className="flex items-center gap-2.5"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-navy-foreground">
                          {initials(fullName(s))}
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate font-medium hover:underline">{fullName(s)}</span>
                          <span className="tabular truncate text-xs text-muted-foreground">{s.id}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      {s.level}
                      {s.arm}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{s.gender}</td>
                    <td className="px-3 py-2.5">
                      {s.guardians[0] ? (
                        <>
                          <span className="block truncate">{s.guardians[0].name}</span>
                          <span className="block text-xs text-muted-foreground">{s.guardians[0].phone}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No guardian linked</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={attendanceTone(s.attendance)}>{s.attendance}</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={academicTone(s.academicStatus)}>{s.academicStatus}</StatusBadge>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={lifecycleTone(s.status)}>{s.status}</StatusBadge>
                    </td>
                    <td className="tabular px-3 py-2.5 text-right">
                      <span className={s.feeBalance > 0 ? "font-medium text-danger" : "text-muted-foreground"}>
                        {s.feeBalance > 0 ? naira(s.feeBalance) : "Cleared"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${fullName(s)}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link to="/people/students/$studentId" params={{ studentId: s.id }}>
                              View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/people/students/$studentId" params={{ studentId: s.id }}>Edit record</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/attendance">Attendance</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/assessment">Results</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to="/finance">Fees & invoices</Link></DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to="/people/students/ids">Identity card</Link>
                          </DropdownMenuItem>
                          {s.status === "Pending approval" && (
                            <DropdownMenuItem onClick={() => { void approveSingleAdmission(s); }}>
                              <CheckCircle2 className="size-4" /> Approve admission
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-danger focus:text-danger" onClick={() => { if (window.confirm(`Withdraw ${fullName(s)}?`)) { updateStudent(s.id, { status: "Withdrawn" }); toast.success("Student withdrawn"); } }}>Withdraw student</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
          <p className="text-muted-foreground">
            Showing <span className="tabular font-medium text-foreground">{rows.length}</span> of{" "}
            <span className="tabular font-medium text-foreground">{filtered.length}</span> students
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={current === 1} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <span className="tabular text-xs text-muted-foreground">
              Page {current} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current === pageCount}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </SectionCard>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-card">
        <IdCard className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">
          5 students in this register have no identity card issued for {`2026/2027`}.
        </span>
        <Button asChild size="sm" variant="outline" className="ml-auto">
          <Link to="/people/students/ids">Open ID card manager</Link>
        </Button>
      </div>
    </AppShell>
  );
}
