import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Camera,
  CloudUpload,
  DoorOpen,
  Fingerprint,
  QrCode,
  RefreshCw,
  ScanLine,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge, attendanceTone } from "@/components/kit/status-badge";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { CLASSES, GATE_SCANS, SYNC_QUEUE, VISITORS, registerFor, type MarkState } from "@/data/academics";
import { STAFF, fullName } from "@/data/school";
import { formatDateTime, initials } from "@/lib/format";
import { reviewAttendance, saveAttendance, updateAttendanceFollowUp, useAttendance } from "@/data/attendance-store";
import { createAccessEvent, getStaffAttendanceSummary, resolvePerson, useAccessEvents, type AccessPersonType } from "@/data/access-store";
import { getProfile } from "@/lib/role-profiles";
import { useRole } from "@/lib/role-context";
import { getTeacherAttendance, getRepeatedAttendanceAlerts, recordGuardianContact, saveTeacherAttendance, useAttendanceOperations } from "@/data/attendance-operations-store";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance & Access — EduCore" },
      {
        name: "description",
        content:
          "Daily roll call, QR and fingerprint capture, gate access logs, offline sync queue and visitor management for the school.",
      },
      { property: "og:title", content: "Attendance & Access — EduCore" },
      {
        property: "og:description",
        content: "Mark attendance by QR, fingerprint or manual roll call and reconcile offline devices.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

const MARKS: MarkState[] = ["Present", "Late", "Absent", "Excused"];

function AttendancePage() {
  const { role, profileId } = useRole();
  const linkedProfile = getProfile(role, profileId);
  const canManageRegister = ["administrator", "principal", "teacher"].includes(role);
  const canReviewRegister = role === "administrator" || role === "principal";
  const [classId, setClassId] = useState("C-JS2A");
  const cls = CLASSES.find((c) => c.id === classId)!;
  const base = useMemo(() => {
    const register = registerFor(cls.level);
    return role === "student" || role === "parent" ? register.filter((row) => linkedProfile?.childIds.includes(row.student.id)) : register;
  }, [cls.level, linkedProfile, role]);
  const attendance = useAttendance(classId, cls.level);
  const [marks, setMarks] = useState<Record<string, MarkState>>(attendance.marks);
  const [queue, setQueue] = useState(() => {
    if (typeof window === "undefined") return SYNC_QUEUE;
    try { return JSON.parse(window.localStorage.getItem("educore.attendance-sync-queue") ?? "null") ?? SYNC_QUEUE; } catch { return SYNC_QUEUE; }
  });
  const [visitors, setVisitors] = useState(() => {
    if (typeof window === "undefined") return VISITORS;
    try { return JSON.parse(window.localStorage.getItem("educore.visitors") ?? "null") ?? VISITORS; } catch { return VISITORS; }
  });
  const [activeTab, setActiveTab] = useState("roll");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [personType, setPersonType] = useState<AccessPersonType>("Student");
  const [method, setMethod] = useState<"QR scan" | "Fingerprint">("QR scan");
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "ready" | "unsupported" | "denied">("idle");
  const [captureMessage, setCaptureMessage] = useState("Choose Student or Staff, then activate a capture method.");
  const [visitorOpen, setVisitorOpen] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorHost, setVisitorHost] = useState("");
  const [visitorPurpose, setVisitorPurpose] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const allAccessEvents = useAccessEvents();
  const accessEvents = role === "student" || role === "parent" ? allAccessEvents.filter((event) => linkedProfile?.childIds.includes(event.personId)) : allAccessEvents;
  const staffSummary = getStaffAttendanceSummary();
  const operations = useAttendanceOperations();
  const canManageTeacherAttendance = role === "administrator" || role === "principal" || role === "teacher";

  useEffect(() => setMarks(attendance.marks), [attendance.marks]);

  useEffect(() => {
    if (!scannerOpen || method !== "QR scan") return;
    let stream: MediaStream | undefined;
    let timer: number | undefined;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("unsupported");
        setCaptureMessage("This browser does not provide camera access.");
        return;
      }
      setCameraStatus("starting");
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraStatus("ready");
        setCaptureMessage("Point the camera at the QR code on a student or staff identity card.");
        const Detector = (window as unknown as { BarcodeDetector?: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
        if (Detector) {
          const detector = new Detector({ formats: ["qr_code"] });
          timer = window.setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue ?? "";
            const personId = value.match(/^educore:(?:student|staff):(.+)$/i)?.[1];
            if (!personId || !resolvePerson(personId, personType)) return;
            const result = createAccessEvent({ personId, personType, gate: "Main Gate · In-app scanner", method });
            if (result.ok) {
              setCaptureMessage(`${result.event.name} clocked ${result.event.direction.toLowerCase()}.`);
              toast.success(`${result.event.name} clocked ${result.event.direction.toLowerCase()}`);
              if (timer) window.clearInterval(timer);
            } else setCaptureMessage(result.error);
          }, 700);
        } else {
          setCaptureMessage("Camera is ready. QR decoding is not available in this browser.");
        }
      } catch {
        setCameraStatus("denied");
        setCaptureMessage("Camera permission was denied. Allow camera access to scan identity cards.");
      }
    };
    void startCamera();
    return () => {
      if (timer) window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scannerOpen, method, personType]);

  const rows = base.map((r) => ({ ...r, state: marks[r.student.id] ?? r.state }));
  const count = (m: MarkState) => rows.filter((r) => r.state === m).length;
  const rate = rows.length ? Math.round(((count("Present") + count("Late")) / rows.length) * 100) : 0;
  const absentRows = rows.filter((row) => row.state === "Absent");
  const openFollowUps = attendance.followUps?.filter((item) => item.state !== "Resolved") ?? [];
  const pending = queue.filter((q) => q.status === "Pending").length;
  const saveQueue = (next: typeof queue) => { setQueue(next); window.localStorage.setItem("educore.attendance-sync-queue", JSON.stringify(next)); };
  const saveVisitors = (next: typeof visitors) => { setVisitors(next); window.localStorage.setItem("educore.visitors", JSON.stringify(next)); };
  const addVisitor = () => {
    if (!visitorName.trim() || !visitorHost.trim() || !visitorPurpose.trim()) { toast.error("Enter visitor, host and purpose"); return; }
    saveVisitors([...visitors, { id: `VIS-${Date.now()}`, name: visitorName.trim(), purpose: visitorPurpose.trim(), host: visitorHost.trim(), badge: `V-${String(visitors.length + 1).padStart(3, "0")}`, inTime: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }), outTime: "—" }]);
    setVisitorName(""); setVisitorHost(""); setVisitorPurpose(""); setVisitorOpen(false); toast.success("Visitor checked in");
  };

  return (
    <AppShell>
      <PageHeader
        title="Attendance & Access"
        description="Capture attendance by QR, fingerprint or manual roll call, reconcile offline devices and control who is on campus."
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Attendance & Access" }]}
        actions={
          <>
            {canManageRegister || role === "security" ? <Button variant="outline" size="sm" onClick={() => { setScannerOpen(true); setActiveTab("gate"); }}>
              <QrCode className="size-4" /> Open scanner
            </Button> : null}
            {canManageRegister && attendance.status !== "Submitted" && attendance.status !== "Approved" ? <Button size="sm" onClick={() => { saveAttendance(classId, marks, "Submitted"); toast.success("Attendance submitted for approval"); }}>
              Submit register
            </Button> : null}
            {canReviewRegister && attendance.status === "Submitted" ? <>
              <Button variant="outline" size="sm" onClick={() => { reviewAttendance(classId, "Returned", role === "principal" ? "Principal" : "School Administrator", "Please review flagged attendance exceptions."); toast.info("Attendance returned for correction"); }}>Return</Button>
              <Button size="sm" onClick={() => { reviewAttendance(classId, "Approved", role === "principal" ? "Principal" : "School Administrator"); toast.success("Attendance approved"); }}>Approve</Button>
            </> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Present today" value={`${count("Present")}`} sub={`of ${rows.length} in ${cls.level}${cls.arm}`} icon={UserCheck} />
        <KpiCard label="Attendance rate" value={`${rate}%`} sub="Includes late arrivals" icon={Users} delta={{ value: "1.8 pts", direction: "up" }} />
        <KpiCard label="Gate scans today" value={`${GATE_SCANS.length * 164}`} sub="Across 3 scanners" icon={ScanLine} />
        <KpiCard
          label="Records awaiting sync"
          value={`${queue.filter((q) => q.status !== "Synced").reduce((a, q) => a + q.records, 0)}`}
          sub={`${pending} devices pending`}
          icon={CloudUpload}
          tone={pending ? "warning" : "default"}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="roll">Roll call</TabsTrigger>
          <TabsTrigger value="gate">Gate access log</TabsTrigger>
          <TabsTrigger value="sync">Offline sync queue</TabsTrigger>
          {canManageTeacherAttendance && <TabsTrigger value="staff">Teacher attendance</TabsTrigger>}
          {(role === "administrator" || role === "principal") && <TabsTrigger value="alerts">Alerts & contacts</TabsTrigger>}
          {(role === "administrator" || role === "principal" || role === "security") && <TabsTrigger value="visitors">Visitors</TabsTrigger>}
        </TabsList>

        <TabsContent value="roll" className="mt-4 space-y-4">
          <SectionCard
            title="Daily register"
            description="Tap a state to override a captured mark. Overrides are logged and need approval."
            action={
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="h-8 w-52 text-xs">
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
            }
            bodyClassName="p-0"
          >
            <div className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3 text-xs">
              <StatusBadge tone={attendance.status === "Approved" ? "success" : attendance.status === "Returned" ? "danger" : attendance.status === "Submitted" ? "info" : "warning"}>
                {attendance.status}
              </StatusBadge>
              {openFollowUps.length > 0 && <StatusBadge tone="danger">{openFollowUps.length} follow-ups open</StatusBadge>}
              {MARKS.map((m) => (
                <span key={m} className="flex items-center gap-2">
                  <StatusBadge tone={attendanceTone(m)}>{m}</StatusBadge>
                  <span className="tabular font-semibold">{count(m)}</span>
                </span>
              ))}
              <div className="ml-auto flex w-40 items-center gap-2">
                <Progress value={rate} className="h-1.5" />
                <span className="tabular text-xs text-muted-foreground">{rate}%</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Student</th>
                    <th className="px-3 py-2.5 text-left font-medium">Student ID</th>
                    <th className="px-3 py-2.5 text-left font-medium">Capture method</th>
                    <th className="px-3 py-2.5 text-left font-medium">Time</th>
                    <th className="px-5 py-2.5 text-right font-medium">Mark</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.student.id} className="border-t border-border">
                      <td className="px-5 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                            {initials(fullName(r.student))}
                          </span>
                          {fullName(r.student)}
                        </span>
                      </td>
                      <td className="tabular px-3 py-2.5 text-muted-foreground">{r.student.id}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{r.method}</td>
                      <td className="tabular px-3 py-2.5 text-muted-foreground">{r.time ?? "—"}</td>
                      <td className="px-5 py-2">
                        <div className="flex justify-end gap-1">
                          {MARKS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              disabled={!canManageRegister}
                              onClick={() => {
                                const next = { ...marks, [r.student.id]: m };
                                setMarks(next);
                                saveAttendance(classId, next, "Draft");
                              }}
                              className={
                                "rounded-md border px-2 py-1 text-xs transition-colors " +
                                (r.state === m
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:bg-muted")
                              }
                            >
                              {m[0]}
                              <span className="sr-only">{m}</span>
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
          <SectionCard title="Absence follow-up queue" description="Contact guardians for absent students and resolve each exception after follow-up." action={<StatusBadge tone={absentRows.length ? "warning" : "success"}>{absentRows.length} absent</StatusBadge>}>
            {absentRows.length === 0 ? <p className="text-sm text-muted-foreground">No absences are flagged for this register.</p> : (
              <div className="divide-y divide-border">
                {absentRows.map((row) => {
                  const followUp = attendance.followUps?.find((item) => item.studentId === row.student.id);
                  return <div key={row.student.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div><p className="text-sm font-medium">{fullName(row.student)}</p><p className="text-xs text-muted-foreground">{row.student.level}{row.student.arm} · {followUp?.owner ?? "Unassigned"}</p></div>
                    <div className="flex items-center gap-2"><StatusBadge tone={followUp?.state === "Resolved" ? "success" : followUp?.state === "Contacted" ? "info" : "warning"}>{followUp?.state ?? "Open"}</StatusBadge>{followUp?.state !== "Contacted" && <Button variant="outline" size="sm" onClick={() => { recordGuardianContact(row.student, "Contacted", "Absence follow-up contact", linkedProfile?.name ?? "Attendance desk"); updateAttendanceFollowUp(classId, row.student.id, "Contacted", linkedProfile?.name ?? "Attendance desk"); toast.success(`Guardian contact recorded for ${fullName(row.student)}`); }}>{row.student.guardians.length ? "Contact guardian" : "Mark contacted"}</Button>}{followUp?.state === "Contacted" && <Button variant="outline" size="sm" onClick={() => updateAttendanceFollowUp(classId, row.student.id, "Resolved", linkedProfile?.name ?? "Attendance desk")}>Resolve</Button>}</div>
                  </div>;
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {canManageTeacherAttendance && <TabsContent value="staff" className="mt-4 space-y-4"><SectionCard title="Teacher attendance and lateness" description="Record daily staff arrival status for attendance and payroll review." bodyClassName="p-0"><div className="divide-y divide-border">{operations.teachers.map((teacher) => <div key={teacher.staffId} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><div className="min-w-[200px] flex-1"><p className="font-medium">{STAFF.find((member) => member.id === teacher.staffId)?.name ?? teacher.staffId}</p><p className="text-xs text-muted-foreground">{teacher.staffId} · arrival {teacher.arrivalTime}</p></div><Select value={teacher.status} disabled={role === "teacher" && !teacher.staffId.includes(profileId ?? "")} onValueChange={(value) => { saveTeacherAttendance({ ...teacher, status: value as "Present" | "Late" | "Absent" }); toast.success("Teacher attendance saved"); }}><SelectTrigger className="h-8 w-32" aria-label={`Attendance for ${teacher.staffId}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Present">Present</SelectItem><SelectItem value="Late">Late</SelectItem><SelectItem value="Absent">Absent</SelectItem></SelectContent></Select><StatusBadge tone={teacher.status === "Present" ? "success" : "warning"}>{teacher.status}</StatusBadge></div>)}</div></SectionCard></TabsContent>}

        {(role === "administrator" || role === "principal") && <TabsContent value="alerts" className="mt-4 space-y-4"><SectionCard title="Repeated absence and lateness alerts" description="Exceptions requiring leadership follow-up.">{operations.alerts.length ? <div className="space-y-2">{operations.alerts.map((alert) => <div key={alert.staffId} className="flex flex-wrap items-center gap-3 rounded-md border border-warning/30 bg-warning-soft/40 px-4 py-3 text-sm"><StatusBadge tone="warning">{alert.occurrences} occurrences</StatusBadge><span className="font-medium">{STAFF.find((member) => member.id === alert.staffId)?.name}</span><span className="text-muted-foreground">{alert.message}</span></div>)}</div> : <p className="text-sm text-muted-foreground">No repeated attendance exceptions.</p>}</SectionCard><SectionCard title="Guardian contact history" description="Contact outcomes handed off from absence follow-ups." bodyClassName="p-0">{operations.contacts.length ? <div className="divide-y divide-border">{operations.contacts.map((contact) => <div key={contact.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm"><span className="font-medium">{contact.studentId}</span><StatusBadge tone={contact.outcome === "Contacted" ? "success" : "warning"}>{contact.outcome}</StatusBadge><span className="text-muted-foreground">{contact.note} · {contact.contactedBy} · {formatDateTime(contact.contactedAt)}</span></div>)}</div> : <p className="p-5 text-sm text-muted-foreground">No guardian contact records yet.</p>}</SectionCard></TabsContent>}

        <TabsContent value="gate" className="mt-4">
          <SectionCard title="Gate access log" description="Clock students and staff in or out, then review the immutable access event log." bodyClassName="p-0">
            {scannerOpen && (
              <div className="border-b border-border bg-muted/30 p-5">
                <div className="grid gap-3 lg:grid-cols-[180px_1fr_auto]">
                <Select value={personType} onValueChange={(value) => setPersonType(value as AccessPersonType)}>
                  <SelectTrigger aria-label="Person type"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Student">Student</SelectItem><SelectItem value="Staff">Staff</SelectItem></SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button type="button" variant={method === "QR scan" ? "default" : "outline"} onClick={() => setMethod("QR scan")}><Camera className="size-4" /> Scan identity card</Button>
                  <Button type="button" variant={method === "Fingerprint" ? "default" : "outline"} onClick={() => setMethod("Fingerprint")}><Fingerprint className="size-4" /> Fingerprint reader</Button>
                </div>
                <span className="flex items-center justify-end text-xs text-muted-foreground">Direction is automatic</span>
                </div>
                {method === "QR scan" ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(260px,420px)_1fr]">
                    <div className="relative aspect-video overflow-hidden rounded-lg bg-navy">
                      <video ref={videoRef} muted playsInline className="size-full object-cover" aria-label="In-app QR scanner camera" />
                      {cameraStatus !== "ready" && <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-navy-foreground">{cameraStatus === "starting" ? "Starting camera…" : captureMessage}</div>}
                      <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-teal/80" />
                    </div>
                    <div className="flex flex-col justify-center gap-2">
                      <p className="text-sm font-semibold">In-app identity card scanner</p>
                      <p className="text-sm text-muted-foreground">The camera reads the QR code printed on the selected person’s EduCore identity card. No ID or name entry is required.</p>
                      <p className="text-xs text-muted-foreground">{captureMessage}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-3 rounded-md border border-warning/30 bg-warning-soft px-4 py-3">
                    <Fingerprint className="mt-0.5 size-5 text-warning-foreground" />
                    <div><p className="text-sm font-semibold">Fingerprint reader ready for device integration</p><p className="mt-1 text-xs text-warning-foreground/80">A browser cannot identify a person from a generic fingerprint reader by itself. The approved reader service will return the enrolled person ID, then this same access-event flow records the clock action.</p></div>
                  </div>
                )}
              </div>
            )}
            <ul className="divide-y divide-border">
              {accessEvents.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <span
                    className={
                      "flex size-8 items-center justify-center rounded-md border " +
                      (s.ok ? "border-success/25 bg-success-soft text-success" : "border-danger/25 bg-danger-soft text-danger")
                    }
                  >
                    <ScanLine className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-40">
                    <p className="font-medium">{s.name}</p>
                    <p className="tabular text-xs text-muted-foreground">{s.personType} · {s.personId}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{s.gate}</span>
                  <StatusBadge tone={s.direction === "In" ? "info" : "neutral"}>{s.direction}</StatusBadge>
                  <StatusBadge tone={s.ok ? "success" : "danger"}>{s.ok ? "Accepted" : "Rejected"}</StatusBadge>
                  <span className="tabular ml-auto text-xs text-muted-foreground">{formatDateTime(s.occurredAt)}</span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-5">
              <h3 className="text-sm font-semibold">Staff attendance for HR and payroll</h3>
              <p className="mt-1 text-xs text-muted-foreground">Accepted clock events feed payable-day and presence review. Finance can use this period summary when preparing salary.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {staffSummary.map((staff) => (
                  <div key={staff.staffId} className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-medium">{staff.name}</span><StatusBadge tone={staff.currentStatus === "On campus" ? "success" : "neutral"}>{staff.currentStatus}</StatusBadge></div>
                    <p className="mt-1 text-xs text-muted-foreground">{staff.presentDays} payable day{staff.presentDays === 1 ? "" : "s"} · {staff.staffId}</p>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <SectionCard
            title="Offline sync queue"
            description="Devices capture attendance without network and reconcile when they reconnect."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  saveQueue(queue.map((r) => (r.status === "Pending" ? { ...r, status: "Synced" as const } : r)));
                  toast.success("Pending devices synced");
                }}
              >
                <RefreshCw className="size-4" /> Sync all
              </Button>
            }
            bodyClassName="p-0"
          >
            <ul className="divide-y divide-border">
              {queue.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <CloudUpload className="size-4 text-muted-foreground" aria-hidden />
                  <div className="min-w-48">
                    <p className="font-medium">{q.device}</p>
                    <p className="text-xs text-muted-foreground">Captured {formatDateTime(q.captured)}</p>
                  </div>
                  <span className="tabular text-xs text-muted-foreground">{q.records} records</span>
                  <StatusBadge
                    tone={q.status === "Synced" ? "success" : q.status === "Pending" ? "warning" : "danger"}
                    className="ml-auto"
                  >
                    {q.status}
                  </StatusBadge>
                  {q.status === "Conflict" && (
                    <Button size="sm" variant="outline" onClick={() => { saveQueue(queue.map((item) => item.id === q.id ? { ...item, status: "Synced" as const } : item)); toast.success("Conflict resolved and device synced"); }}>
                      Resolve
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        <TabsContent value="visitors" className="mt-4">
          <SectionCard title="Visitors on campus" description="Badge issuance, host and sign-out tracking." action={<Button size="sm" onClick={() => setVisitorOpen(true)}><DoorOpen className="size-4" /> Check in visitor</Button>} bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">Visitor</th>
                    <th className="px-3 py-2.5 text-left font-medium">Purpose</th>
                    <th className="px-3 py-2.5 text-left font-medium">Host</th>
                    <th className="px-3 py-2.5 text-left font-medium">Badge</th>
                    <th className="px-3 py-2.5 text-left font-medium">In</th>
                    <th className="px-5 py-2.5 text-left font-medium">Out</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id} className="border-t border-border">
                      <td className="px-5 py-2.5 font-medium">{v.name}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{v.purpose}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{v.host}</td>
                      <td className="tabular px-3 py-2.5">{v.badge}</td>
                      <td className="tabular px-3 py-2.5">{v.inTime}</td>
                      <td className="tabular px-5 py-2.5">
                        {v.outTime === "—" ? <Button size="sm" variant="outline" onClick={() => { saveVisitors(visitors.map((item) => item.id === v.id ? { ...item, outTime: new Date().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }) } : item)); toast.success("Visitor signed out"); }}>Sign out</Button> : v.outTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-5 py-3">
              <DoorOpen className="size-4 text-muted-foreground" aria-hidden />
              <span className="text-xs text-muted-foreground">Sign-out reminders are sent to hosts at 4:00 pm daily.</span>
              <CheckCircle2 className="ml-auto size-4 text-success" aria-hidden />
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
      <Dialog open={visitorOpen} onOpenChange={setVisitorOpen}><DialogContent><DialogHeader><DialogTitle>Check in visitor</DialogTitle><DialogDescription>Issue a visitor badge and record the host responsible for the visit.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="visitor-name">Visitor name</Label><Input id="visitor-name" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} placeholder="Name of visitor" /></div><div className="space-y-1.5"><Label htmlFor="visitor-purpose">Purpose</Label><Input id="visitor-purpose" value={visitorPurpose} onChange={(event) => setVisitorPurpose(event.target.value)} placeholder="Parent meeting" /></div><div className="space-y-1.5"><Label htmlFor="visitor-host">Host</Label><Input id="visitor-host" value={visitorHost} onChange={(event) => setVisitorHost(event.target.value)} placeholder="Staff member or office" /></div></div><DialogFooter><Button variant="outline" onClick={() => setVisitorOpen(false)}>Cancel</Button><Button onClick={addVisitor}>Issue badge</Button></DialogFooter></DialogContent></Dialog>
    </AppShell>
  );
}
