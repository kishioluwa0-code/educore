import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Landmark,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard, EmptyState } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXAM_REGISTRATIONS, EXAM_TIMETABLE, type ExamBody } from "@/data/academics";
import { STUDENTS, fullName } from "@/data/school";
import { naira, formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/examinations")({
  head: () => ({
    meta: [
      { title: "Examinations — EduCore" },
      {
        name: "description",
        content:
          "Manage internal exams, mock exams and external registrations for BECE, WAEC/WASSCE, NECO/SSCE and NABTEB.",
      },
      { property: "og:title", content: "Examinations — EduCore" },
      {
        property: "og:description",
        content: "Candidate registration, exam timetables, halls and invigilation for Nigerian examination bodies.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExaminationsPage,
});

const BODIES: ExamBody[] = ["BECE", "WAEC / WASSCE", "NECO / SSCE", "NABTEB"];

const INTERNAL_EXAMS = [
  { id: "IEX-01", title: "First Term Mid-term Test", scope: "JSS 1 – SS 3", papers: 14, starts: "2026-09-28", status: "Scheduled" as const },
  { id: "IEX-02", title: "First Term Terminal Examination", scope: "JSS 1 – SS 3", papers: 22, starts: "2026-11-30", status: "Scheduled" as const },
  { id: "IEX-03", title: "SS 3 Mock (WAEC format)", scope: "SS 3", papers: 9, starts: "2026-08-19", status: "Completed" as const },
  { id: "IEX-04", title: "JSS 3 Mock (BECE format)", scope: "JSS 3", papers: 8, starts: "2026-08-22", status: "In progress" as const },
];

const bodyTone = (status: string) =>
  status === "Closed" ? "neutral" : status === "Closing soon" ? "warning" : "success";

const internalTone = (status: string) =>
  status === "Completed" ? "success" : status === "In progress" ? "info" : "neutral";

function ExaminationsPage() {
  const [body, setBody] = useState<ExamBody>("BECE");
  const reg = EXAM_REGISTRATIONS.find((r) => r.body === body)!;

  const candidates = useMemo(
    () => STUDENTS.filter((s) => s.level === reg.level),
    [reg.level],
  );
  const [selected, setSelected] = useState<string[]>([]);

  const totalCandidates = EXAM_REGISTRATIONS.reduce((a, r) => a + r.candidates, 0);
  const totalRegistered = EXAM_REGISTRATIONS.reduce((a, r) => a + r.registered, 0);
  const pending = totalCandidates - totalRegistered;
  const feesDue = EXAM_REGISTRATIONS.reduce(
    (a, r) => a + (r.candidates - r.registered) * r.feePerCandidate,
    0,
  );

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const allSelected = candidates.length > 0 && selected.length === candidates.length;

  return (
    <AppShell>
      <PageHeader
        title="Examinations"
        description="Internal and external examination management — candidate registration, timetables, halls and invigilation for Nigerian examination bodies."
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Examinations" }]}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info("Candidate nominal roll exported to CSV")}>
              <Download className="size-4" /> Nominal roll
            </Button>
            <Button size="sm" onClick={() => toast.success("New examination sitting created")}>
              <ClipboardList className="size-4" /> New examination
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Eligible candidates" value={`${totalCandidates}`} sub="Across all external bodies" icon={Users} />
        <KpiCard label="Registered" value={`${totalRegistered}`} sub={`${Math.round((totalRegistered / totalCandidates) * 100)}% of eligible`} icon={BadgeCheck} />
        <KpiCard label="Registration pending" value={`${pending}`} sub="Missing data or unpaid fees" icon={ClipboardList} tone={pending ? "warning" : "default"} />
        <KpiCard label="Outstanding exam fees" value={naira(feesDue, { compact: true })} sub="Payable to examination bodies" icon={Landmark} tone={feesDue ? "danger" : "default"} />
      </div>

      <Tabs defaultValue="external" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="external">External bodies</TabsTrigger>
          <TabsTrigger value="candidates">Candidate registration</TabsTrigger>
          <TabsTrigger value="timetable">Timetable & halls</TabsTrigger>
          <TabsTrigger value="internal">Internal & mock exams</TabsTrigger>
        </TabsList>

        <TabsContent value="external" className="mt-4 grid gap-4 lg:grid-cols-2">
          {EXAM_REGISTRATIONS.map((r) => {
            const pct = Math.round((r.registered / r.candidates) * 100);
            return (
              <SectionCard
                key={r.body}
                title={r.body}
                description={`${r.level} · deadline ${formatDate(r.deadline)}`}
                action={<StatusBadge tone={bodyTone(r.status)}>{r.status}</StatusBadge>}
              >
                <div className="space-y-4">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="tabular text-2xl font-semibold tracking-tight">
                        {r.registered}
                        <span className="text-base font-normal text-muted-foreground">/{r.candidates}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Candidates registered</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-semibold">{naira(r.feePerCandidate)}</p>
                      <p className="text-xs text-muted-foreground">Fee per candidate</p>
                    </div>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Total payable {naira(r.candidates * r.feePerCandidate)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info(`${r.body} candidate list exported`)}
                      >
                        <FileSpreadsheet className="size-4" /> Export
                      </Button>
                      <Button
                        size="sm"
                        disabled={r.status === "Closed" || r.registered === r.candidates}
                        onClick={() => toast.success(`Registration submitted to ${r.body}`)}
                      >
                        Register remaining
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </TabsContent>

        <TabsContent value="candidates" className="mt-4 space-y-4">
          <SectionCard
            title={`${reg.body} candidates — ${reg.level}`}
            description="Select candidates to include in the nominal roll submitted to the examination body."
            action={
              <Select value={body} onValueChange={(v) => { setBody(v as ExamBody); setSelected([]); }}>
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BODIES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            bodyClassName="p-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
              <span className="text-xs text-muted-foreground">
                {selected.length ? `${selected.length} selected` : `${candidates.length} eligible candidates`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selected.length}
                  onClick={() => toast.success(`${selected.length} candidates added to ${reg.body} roll`)}
                >
                  <BadgeCheck className="size-4" /> Register selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selected.length}
                  onClick={() => toast.info("Examination fee invoices generated")}
                >
                  <Landmark className="size-4" /> Invoice fees
                </Button>
              </div>
            </div>

            {candidates.length === 0 ? (
              <EmptyState
                title="No eligible candidates"
                description="No students are currently enrolled in the level this examination body serves."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-xs text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="w-10 px-5 py-2.5 text-left">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={(c) => setSelected(c ? candidates.map((s) => s.id) : [])}
                          aria-label="Select all candidates"
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left font-medium">Candidate</th>
                      <th className="px-3 py-2.5 text-left font-medium">Admission no.</th>
                      <th className="px-3 py-2.5 text-left font-medium">Class</th>
                      <th className="px-3 py-2.5 text-left font-medium">Documents</th>
                      <th className="px-3 py-2.5 text-left font-medium">Fee status</th>
                      <th className="px-3 py-2.5 text-right font-medium">Exam fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.map((s) => (
                      <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                        <td className="px-5 py-2.5">
                          <Checkbox
                            checked={selected.includes(s.id)}
                            onCheckedChange={() => toggle(s.id)}
                            aria-label={`Select ${fullName(s)}`}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-7 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-muted-foreground">
                              {initials(fullName(s))}
                            </span>
                            <span className="font-medium">{fullName(s)}</span>
                          </div>
                        </td>
                        <td className="tabular px-3 py-2.5 text-muted-foreground">{s.admissionNo}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {s.level} {s.arm}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={s.documentsComplete ? "success" : "warning"}>
                            {s.documentsComplete ? "Complete" : "Incomplete"}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge tone={s.feeBalance > 0 ? "danger" : "success"}>
                            {s.feeBalance > 0 ? `Owing ${naira(s.feeBalance, { compact: true })}` : "Cleared"}
                          </StatusBadge>
                        </td>
                        <td className="tabular px-3 py-2.5 text-right">{naira(reg.feePerCandidate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="timetable" className="mt-4 space-y-4">
          <SectionCard
            title="Examination timetable"
            description="Papers, halls and assigned invigilators for the current examination cycle."
            action={
              <Button variant="outline" size="sm" onClick={() => toast.info("Timetable exported as PDF")}>
                <CalendarDays className="size-4" /> Export timetable
              </Button>
            }
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-2.5 text-left font-medium">Date</th>
                    <th className="px-3 py-2.5 text-left font-medium">Time</th>
                    <th className="px-3 py-2.5 text-left font-medium">Paper</th>
                    <th className="px-3 py-2.5 text-left font-medium">Body</th>
                    <th className="px-3 py-2.5 text-left font-medium">Hall</th>
                    <th className="px-3 py-2.5 text-left font-medium">Invigilator</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAM_TIMETABLE.map((p) => (
                    <tr key={`${p.date}-${p.paper}`} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-2.5">{formatDate(p.date)}</td>
                      <td className="tabular px-3 py-2.5">{p.time}</td>
                      <td className="px-3 py-2.5 font-medium">{p.paper}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone="info" dot={false}>
                          {p.body}
                        </StatusBadge>
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.hall}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{p.invigilator}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard title="Examination integrity" description="Controls applied to every sitting.">
            <ul className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Seat & hall allocation", detail: "Candidates seated by index number with duplicate checks." },
                { title: "Attendance verification", detail: "QR / fingerprint check-in at hall entry before papers." },
                { title: "Malpractice reporting", detail: "Invigilator incident forms attached to candidate records." },
              ].map((c) => (
                <li key={c.title} className="rounded-md border border-border bg-muted/40 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-muted-foreground" aria-hidden />
                    <p className="text-sm font-medium">{c.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.detail}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="internal" className="mt-4">
          <SectionCard
            title="Internal & mock examinations"
            description="School-run sittings, including mocks that mirror BECE and WAEC formats."
            bodyClassName="p-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="px-5 py-2.5 text-left font-medium">Examination</th>
                    <th className="px-3 py-2.5 text-left font-medium">Scope</th>
                    <th className="px-3 py-2.5 text-left font-medium">Papers</th>
                    <th className="px-3 py-2.5 text-left font-medium">Starts</th>
                    <th className="px-3 py-2.5 text-left font-medium">Status</th>
                    <th className="px-3 py-2.5 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {INTERNAL_EXAMS.map((e) => (
                    <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-5 py-2.5 font-medium">{e.title}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{e.scope}</td>
                      <td className="tabular px-3 py-2.5">{e.papers}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{formatDate(e.starts)}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone={internalTone(e.status)}>{e.status}</StatusBadge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`${e.title} — sitting details opened`)}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
