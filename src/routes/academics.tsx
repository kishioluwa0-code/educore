import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookMarked, Building2, CalendarRange, Check, DoorOpen, Layers, Pencil, Plus, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CLASSES, PERIODS, SCHEME_OF_WORK, SUBJECTS, WEEKDAYS, timetableFor } from "@/data/academics";
import { STAFF } from "@/data/school";
import { saveAcademicAssignment, saveTimetableOverride, useAcademicAssignments, useTimetableOverrides } from "@/data/academic-store";
import { createAcademicClass, createAcademicSubject, getAssignmentConflicts, getTeacherWorkload, getTimetableClashes, saveCalendarEntry, saveCurriculumOwner, useAcademicStructure } from "@/data/academic-structure-store";
import { useRole } from "@/lib/role-context";

export const Route = createFileRoute("/academics")({
  head: () => ({
    meta: [
      { title: "Academics — EduCore" },
      {
        name: "description",
        content: "Curriculum, classes, arms, subjects, departments, scheme of work, lesson planning and timetabling.",
      },
      { property: "og:title", content: "Academics — EduCore" },
      {
        property: "og:description",
        content: "Curriculum, classes, arms, subjects, departments, scheme of work, lesson planning and timetabling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcademicsPage,
});

function AcademicsPage() {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");
  const [timetableClass, setTimetableClass] = useState("C-JS2A");
  const assignments = useAcademicAssignments();
  const timetableOverrides = useTimetableOverrides();
  const structure = useAcademicStructure();
  const { role } = useRole();
  const subjectCatalog = structure.subjects;
  const classCatalog = structure.classes;
  const [editingTimetable, setEditingTimetable] = useState(false);
  const [assignmentSubject, setAssignmentSubject] = useState(SUBJECTS[0]!.code);
  const [assignmentTeacher, setAssignmentTeacher] = useState(STAFF[0]!.name);
  const [owner, setOwner] = useState(STAFF[0]!.name);
  const canManageStructure = role === "administrator" || role === "principal";

  const departments = useMemo(() => Array.from(new Set(subjectCatalog.map((s) => s.department))), [subjectCatalog]);

  const filteredSubjects = useMemo(
    () =>
      subjectCatalog.filter(
        (s) =>
          (dept === "all" || s.department === dept) &&
          (s.name.toLowerCase().includes(query.toLowerCase()) ||
            s.code.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, dept, subjectCatalog],
  );

  const avgCoverage = Math.round(subjectCatalog.reduce((a, s) => a + s.coverage, 0) / subjectCatalog.length);
  const totalEnrolled = classCatalog.reduce((a, c) => a + c.enrolled, 0);
  const totalCapacity = classCatalog.reduce((a, c) => a + c.capacity, 0);
  const schemeCovered = SCHEME_OF_WORK.filter((w) => w.status === "Covered").length;
  const schemePct = Math.round((schemeCovered / SCHEME_OF_WORK.length) * 100);
  const workload = getTeacherWorkload(assignments);
  const assignmentConflicts = getAssignmentConflicts(assignments);
  const timetableClashes = getTimetableClashes(structure.classes, assignments, timetableOverrides);

  const tt = useMemo(() => timetableFor(timetableClass), [timetableClass]);
  const ttCls = classCatalog.find((c) => c.id === timetableClass) ?? classCatalog[0]!;

  const schemeTone = (status: string) =>
    status === "Covered" ? ("success" as const) : status === "In progress" ? ("info" as const) : ("neutral" as const);

  return (
    <AppShell>
      <PageHeader
        title="Academics"
        description="Curriculum, subjects, classes and arms, timetabling and scheme of work."
        actions={
          <Button
            onClick={() => { if (!canManageStructure) return; const name = window.prompt("Subject name"); const code = window.prompt("Subject code", name?.slice(0, 3).toUpperCase()); if (!name?.trim() || !code?.trim()) return; const created = createAcademicSubject({ code: code.trim().toUpperCase(), name: name.trim(), department: "General", levels: "JSS 1 – SS 3", teacher: "Unassigned", periods: 2, coverage: 0, core: false }); toast[created ? "success" : "error"](created ? "Subject created" : "A subject with that code already exists"); }}
            disabled={!canManageStructure}
          >
            <Plus className="mr-2 size-4" /> Add subject
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Subjects offered"
          value={String(subjectCatalog.length)}
          icon={BookMarked}
          sub={`${departments.length} departments · ${subjectCatalog.filter((s) => s.core).length} core`}
        />
        <KpiCard
          label="Classes & arms"
          value={String(classCatalog.length)}
          icon={Layers}
          sub={`${totalEnrolled} of ${totalCapacity} seats filled`}
        />
        <KpiCard
          label="Avg. curriculum coverage"
          value={`${avgCoverage}%`}
          icon={CalendarRange}
          sub="Across all subjects, this term"
        />
        <KpiCard
          label="Scheme of work (MTH · JSS 2)"
          value={`${schemePct}%`}
          icon={BookMarked}
          sub={`${schemeCovered} of ${SCHEME_OF_WORK.length} weeks covered`}
        />
      </div>

      <Tabs defaultValue="subjects" className="mt-6">
        <TabsList>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="classes">Classes & arms</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="scheme">Scheme of work</TabsTrigger>
        </TabsList>

        {/* Subjects */}
        <TabsContent value="subjects">
          <SectionCard
            title="Subject directory"
            description="All subjects mapped to departments, levels and assigned teachers."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search subject or code…"
                    className="w-56 pl-8"
                  />
                </div>
                <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Subject</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Levels</th>
                    <th className="px-3 py-2">Teacher</th>
                    <th className="px-3 py-2">Periods/wk</th>
                    <th className="px-3 py-2">Coverage</th>
                    <th className="px-3 py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((s) => (
                    <tr key={s.code} className="hover:bg-muted/40 border-b last:border-0">
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold">{s.code}</td>
                      <td className="px-3 py-2.5 font-medium">{s.name}</td>
                      <td className="text-muted-foreground px-3 py-2.5">{s.department}</td>
                      <td className="text-muted-foreground px-3 py-2.5">{s.levels}</td>
                      <td className="px-3 py-2.5">
                        {Array.from(new Set(assignments.filter((assignment) => assignment.subjectCode === s.code).map((assignment) => assignment.teacher))).join(", ") || s.teacher}
                      </td>
                      <td className="px-3 py-2.5 text-center">{s.periods}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <Progress value={s.coverage} className="h-1.5 w-20" />
                          <span className="text-muted-foreground text-xs">{s.coverage}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone={s.core ? "teal" : "neutral"}>{s.core ? "Core" : "Elective"}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                  {filteredSubjects.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-muted-foreground px-3 py-8 text-center">
                        No subjects match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Classes */}
        <TabsContent value="classes">
          <SectionCard
            title="Classes & arms"
            description="Form teachers, room allocation and enrolment against capacity per class arm."
            action={
              <Button
                variant="outline"
                onClick={() => { if (!canManageStructure) return; const level = window.prompt("Class level", "JSS 1"); const arm = window.prompt("Arm", "A"); if (!level?.trim() || !arm?.trim()) return; const created = createAcademicClass({ id: `C-${level.replaceAll(" ", "")}-${arm.trim().toUpperCase()}`, level: level.trim(), arm: arm.trim().toUpperCase(), section: level.startsWith("SS") ? "Senior Secondary" : level.startsWith("JSS") ? "Junior Secondary" : "Primary", formTeacher: "Unassigned", capacity: 40, enrolled: 0, room: "Unassigned" }); toast[created ? "success" : "error"](created ? "Class arm created" : "That class arm already exists"); }}
                disabled={!canManageStructure}
              >
                <Plus className="mr-2 size-4" /> New arm
              </Button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {classCatalog.map((c) => {
                const fill = Math.round((c.enrolled / c.capacity) * 100);
                return (
                  <div key={c.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold">
                          {c.level} {c.arm}
                        </p>
                        <p className="text-muted-foreground text-xs">{c.section}</p>
                      </div>
                      <StatusBadge tone={fill >= 100 ? "danger" : fill >= 90 ? "warning" : "success"}>
                        {fill >= 100 ? "Full" : `${fill}% filled`}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm">
                      <p className="flex items-center gap-2">
                        <Users className="text-muted-foreground size-4" /> {c.formTeacher}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-2">
                        <DoorOpen className="size-4" /> {c.room}
                      </p>
                    </div>
                    <div className="mt-3">
                      <Progress value={fill} className="h-1.5" />
                      <p className="text-muted-foreground mt-1 text-xs">
                        {c.enrolled} enrolled · capacity {c.capacity}
                      </p>
                    </div>
                    <div className="mt-4 border-t border-border pt-3">
                      {c.section === "Primary" && <p className="mb-4 text-xs text-muted-foreground">Class-teacher ownership is managed in People. This academic view is read-only for class assignments.</p>}
                      <p className="text-xs font-medium">Assign subject teacher</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <Select value={assignmentSubject} onValueChange={setAssignmentSubject}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
                          <SelectContent>{subjectCatalog.map((subject) => <SelectItem key={subject.code} value={subject.code}>{subject.name}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select value={assignmentTeacher} onValueChange={setAssignmentTeacher}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Teacher" /></SelectTrigger>
                          <SelectContent>{STAFF.filter((staff) => staff.role.toLowerCase().includes("teacher")).map((staff) => <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <Button className="mt-2 h-8 text-xs" size="sm" onClick={() => { saveAcademicAssignment({ classId: c.id, subjectCode: assignmentSubject, teacher: assignmentTeacher }); toast.success("Teacher assignment saved"); }}>
                        <Check className="size-3.5" /> Save assignment
                      </Button>
                      {assignments.filter((assignment) => assignment.classId === c.id).map((assignment) => (
                        <p key={assignment.id} className="mt-2 text-xs text-muted-foreground">
                          {subjectCatalog.find((subject) => subject.code === assignment.subjectCode)?.name ?? assignment.subjectCode}: {assignment.teacher}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        {/* Timetable */}
        <TabsContent value="timetable">
          <SectionCard
            title={`Timetable — ${ttCls.level} ${ttCls.arm}`}
            description={`${ttCls.room} · Form teacher: ${ttCls.formTeacher}`}
            action={
              <div className="flex flex-wrap gap-2">
                <Select value={timetableClass} onValueChange={setTimetableClass}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classCatalog.map((c) => <SelectItem key={c.id} value={c.id}>{c.level} {c.arm}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant={editingTimetable ? "default" : "outline"} size="sm" onClick={() => setEditingTimetable((value) => !value)}>
                  <Pencil className="size-4" /> {editingTimetable ? "Done editing" : "Edit timetable"}
                </Button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="text-muted-foreground px-2 py-2 text-left text-xs uppercase">Time</th>
                    {WEEKDAYS.map((d) => (
                      <th key={d} className="text-muted-foreground px-2 py-2 text-left text-xs uppercase">
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((time, p) => (
                    <tr key={time} className="border-t">
                      <td className="text-muted-foreground px-2 py-2 font-mono text-xs whitespace-nowrap">{time}</td>
                      {tt.map((day) => {
                        const slot = day.slots[p]!;
                        const override = timetableOverrides.find((item) => item.classId === timetableClass && item.day === day.day && item.period === p);
                        const subjectCode = override?.subjectCode ?? slot.code;
                        const subject = subjectCatalog.find((item) => item.code === subjectCode) ?? subjectCatalog[0]!;
                        const assignedTeacher = assignments.find(
                          (assignment) => assignment.classId === timetableClass && assignment.subjectCode === subjectCode,
                        )?.teacher;
                        return (
                          <td key={day.day} className="px-1.5 py-1.5">
                            {slot.code === "BREAK" ? (
                              <div className="bg-muted/60 text-muted-foreground rounded-md px-2 py-2 text-center text-xs font-medium">
                                Break
                              </div>
                            ) : (
                              editingTimetable ? (
                                <Select value={subjectCode} onValueChange={(value) => saveTimetableOverride({ classId: timetableClass, day: day.day, period: p, subjectCode: value })}>
                                  <SelectTrigger className="h-auto min-h-[52px] w-full border-accent bg-accent/40 px-2 py-1.5 text-left text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{subjectCatalog.map((item) => <SelectItem key={item.code} value={item.code}>{item.name}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <div className="border-accent bg-accent/40 rounded-md border px-2 py-1.5">
                                  <p className="text-xs font-semibold">{subject.name}</p>
                                  <p className="text-muted-foreground text-[11px]">{assignedTeacher ?? subject.teacher}</p>
                                </div>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Scheme of work */}
        <TabsContent value="scheme">
          <SectionCard
            title="Scheme of work — Mathematics, JSS 2"
            description="Term curriculum progression tracked week by week against the approved scheme."
            action={
              <Button
                variant="outline"
                onClick={() => toast.success("Scheme exported", { description: "Scheme of work PDF is being prepared." })}
              >
                <Building2 className="mr-2 size-4" /> Export scheme
              </Button>
            }
          >
            <div className="mb-4 flex items-center gap-3">
              <Progress value={schemePct} className="h-2 flex-1" />
              <span className="text-sm font-medium">{schemePct}% complete</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left text-xs uppercase">
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2">Topic</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEME_OF_WORK.map((w) => (
                    <tr key={w.week} className="hover:bg-muted/40 border-b last:border-0">
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold">W{String(w.week).padStart(2, "0")}</td>
                      <td className="px-3 py-2.5">{w.topic}</td>
                      <td className="px-3 py-2.5">
                        <StatusBadge tone={schemeTone(w.status)}>{w.status}</StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <SectionCard title="Teacher workload" description="Assignments per teacher across the academic structure.">
          <div className="space-y-2">{workload.length ? workload.map((item) => <div key={item.teacher} className="flex justify-between text-sm"><span>{item.teacher}</span><span className="tabular text-muted-foreground">{item.assignments} assignment{item.assignments === 1 ? "" : "s"}</span></div>) : <p className="text-sm text-muted-foreground">No teacher assignments recorded.</p>}</div>
          {assignmentConflicts.length > 0 && <p className="mt-3 text-xs text-danger">{assignmentConflicts.length} duplicate assignment conflict{assignmentConflicts.length === 1 ? "" : "s"} detected.</p>}
        </SectionCard>
        <SectionCard title="Timetable validation" description="Teacher clashes are checked against saved timetable overrides.">
          {timetableClashes.length ? <div className="space-y-2">{timetableClashes.map((clash) => <div key={clash} className="flex items-center gap-2 text-sm"><StatusBadge tone="danger">Clash</StatusBadge><span>{clash}</span></div>)}</div> : <div className="flex items-center gap-2 text-sm text-success"><Check className="size-4" /> No saved teacher clashes detected.</div>}
        </SectionCard>
        <SectionCard title="Curriculum ownership" description="Assign accountability for the approved scheme of work.">
          <div className="space-y-3"><p className="text-sm">Mathematics · JSS 2 scheme</p><Select value={owner} onValueChange={setOwner}><SelectTrigger aria-label="Curriculum owner"><SelectValue /></SelectTrigger><SelectContent>{STAFF.map((staff) => <SelectItem key={staff.id} value={staff.name}>{staff.name}</SelectItem>)}</SelectContent></Select><Button size="sm" variant="outline" onClick={() => { saveCurriculumOwner("Mathematics · JSS 2", owner); toast.success("Curriculum owner saved"); }}>Save owner</Button></div>
        </SectionCard>
      </div>
      <SectionCard title="Academic calendar" description="Record term, examination, holiday and school events with dates." className="mt-4" action={<Button size="sm" variant="outline" onClick={() => { const title = window.prompt("Calendar event title"); const starts = window.prompt("Start date (YYYY-MM-DD)"); const ends = window.prompt("End date (YYYY-MM-DD)", starts ?? ""); if (!title?.trim() || !starts || !ends) return; saveCalendarEntry({ title: title.trim(), starts, ends, type: "Event" }); toast.success("Calendar entry saved"); }}> <Plus className="size-4" /> Add event</Button>}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{structure.calendar.map((entry) => <div key={entry.id} className="rounded-md border border-border p-3"><p className="text-sm font-medium">{entry.title}</p><p className="mt-1 text-xs text-muted-foreground">{entry.starts} to {entry.ends}</p><StatusBadge tone={entry.type === "Examination" ? "warning" : "info"} className="mt-2">{entry.type}</StatusBadge></div>)}</div>
      </SectionCard>
    </AppShell>
  );
}
