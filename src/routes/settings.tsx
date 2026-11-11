import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Save, Settings2 } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { SCHOOL, SESSIONS, TERMS } from "@/data/school";
import { getSchoolSettings, saveSchoolSettings } from "@/data/school-settings-store";
import { useRole } from "@/lib/role-context";
import { getReportCardSettings, saveReportCardSettings } from "@/data/report-card-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — EduCore" },
      { name: "description", content: "School configuration, sessions, terms, grading, assessment, notifications, ID cards and report cards." },
      { property: "og:title", content: "Settings — EduCore" },
      { property: "og:description", content: "School configuration, sessions, terms, grading, assessment, notifications, ID cards and report cards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { role } = useRole();
  const [schoolName, setSchoolName] = useState(() => getSchoolSettings().name);
  const [address, setAddress] = useState(() => getSchoolSettings().address);
  const [motto, setMotto] = useState(() => getSchoolSettings().motto);
  const [session, setSession] = useState(() => getSchoolSettings().session);
  const [term, setTerm] = useState(() => getSchoolSettings().term);
  const [notifications, setNotifications] = useState(() => getSchoolSettings().notifications);
  const [saved, setSaved] = useState(false);
  const reportSettings = getReportCardSettings();
  const [principalName, setPrincipalName] = useState(reportSettings.principalName);
  const [principalSignature, setPrincipalSignature] = useState(reportSettings.principalSignature ?? "");
  const [schoolStamp, setSchoolStamp] = useState(reportSettings.schoolStamp ?? "");
  const readImage = (file: File, setter: (value: string) => void) => { if (!file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => setter(String(reader.result)); reader.readAsDataURL(file); };
  const save = () => { if (role !== "administrator") return; saveSchoolSettings({ name: schoolName.trim() || SCHOOL.name, address: address.trim() || SCHOOL.address, motto: motto.trim() || SCHOOL.motto, session, term, notifications }, role); saveReportCardSettings({ principalName: principalName.trim() || "Principal", principalSignature: principalSignature || undefined, schoolStamp: schoolStamp || undefined }); setSaved(true); window.setTimeout(() => setSaved(false), 2500); };
  return <AppShell><PageHeader title="Settings" description="Configure school identity, academic periods, grading, communications and document defaults." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Settings" }]} actions={<Button size="sm" onClick={save}><Save className="size-4" /> Save changes</Button>} />{saved && <div className="mt-4 flex items-center gap-2 rounded-md border border-success/30 bg-success-soft px-4 py-3 text-sm text-success" role="status"><CheckCircle2 className="size-4" /> Settings saved on this device.</div>}<div className="mt-6 grid gap-4 xl:grid-cols-2"><SectionCard title="School configuration" description="The identity shown on receipts, report cards and communications."><div className="space-y-4"><div className="space-y-1.5"><Label htmlFor="school-name">School name</Label><Input id="school-name" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="school-address">Address</Label><Input id="school-address" value={address} onChange={(event) => setAddress(event.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="school-motto">Motto</Label><Input id="school-motto" value={motto} onChange={(event) => setMotto(event.target.value)} /></div></div></SectionCard><SectionCard title="Academic calendar" description="Current session and term used throughout academic workflows."><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label>Session</Label><Select value={session} onValueChange={setSession}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SESSIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><div className="space-y-1.5"><Label>Term</Label><Select value={term} onValueChange={setTerm}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TERMS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div></div></SectionCard><SectionCard title="Academic policy" description="Defaults used by assessment and report-card workflows."><div className="divide-y divide-border"><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Continuous assessment weighting</p><p className="text-xs text-muted-foreground">CA 30% and examination 70% for secondary levels.</p></div><Settings2 className="size-4 text-muted-foreground" /></div><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Nigerian grading scale</p><p className="text-xs text-muted-foreground">WAEC-aligned A1 to F9 interpretation.</p></div><Settings2 className="size-4 text-muted-foreground" /></div></div></SectionCard><SectionCard title="Notifications and documents" description="Control defaults for school communications and generated documents."><div className="divide-y divide-border"><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Enable notification delivery</p><p className="text-xs text-muted-foreground">Allow configured in-app, email, SMS and push messages.</p></div><Switch checked={notifications} onCheckedChange={setNotifications} /></div><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Include QR identity on documents</p><p className="text-xs text-muted-foreground">Add record-reference QR codes to cards and report cards.</p></div><Switch defaultChecked /></div></div></SectionCard></div></AppShell>;
}
