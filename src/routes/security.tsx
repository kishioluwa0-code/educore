import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, LockKeyhole, ShieldCheck, Smartphone } from "lucide-react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, RestrictedState, SectionCard } from "@/components/kit/page";
import { KpiCard } from "@/components/kit/kpi-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS, USER_ROLES, useRole, type UserRole } from "@/lib/role-context";

export const Route = createFileRoute("/security")({
  head: () => ({ meta: [{ title: "Security — EduCore" }, { name: "description", content: "Roles, permissions, audit logs, approval workflows, devices and security events." }, { name: "robots", content: "noindex" }] }),
  component: SecurityPage,
});

const MODULES = ["Students", "Academics", "Attendance", "Assessment", "Finance", "Reports"];
const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  administrator: MODULES,
  principal: ["Students", "Academics", "Attendance", "Assessment", "Reports"],
  teacher: ["Students", "Academics", "Attendance", "Assessment"],
  bursar: ["Students", "Finance", "Reports"],
  examinations: ["Students", "Assessment", "Reports"],
  hr: ["Students", "Reports"],
  security: ["Students", "Attendance"],
  parent: ["Students", "Assessment", "Reports"],
  student: ["Students", "Assessment", "Reports"],
};

function PermissionMatrix() {
  const { role } = useRole();
  const canEdit = role === "administrator";
  const [permissions, setPermissions] = useState<Record<UserRole, string[]>>(() => {
    if (typeof window === "undefined") return DEFAULT_PERMISSIONS;
    try { return JSON.parse(window.localStorage.getItem("educore.permission-matrix") ?? "null") ?? DEFAULT_PERMISSIONS; } catch { return DEFAULT_PERMISSIONS; }
  });
  const toggle = (userRole: UserRole, module: string, enabled: boolean) => setPermissions((current) => ({ ...current, [userRole]: enabled ? [...current[userRole], module] : current[userRole].filter((item) => item !== module) }));
  const save = () => { window.localStorage.setItem("educore.permission-matrix", JSON.stringify(permissions)); window.localStorage.setItem("educore.permission-matrix-updated", new Date().toISOString()); };
  return <SectionCard title="Permission matrix" description="Control which roles can access each operational module." action={canEdit ? <Button size="sm" onClick={save}>Save permissions</Button> : undefined} bodyClassName="p-0">{!canEdit && <div className="border-b border-border px-5 py-3"><RestrictedState action="edit the permission matrix" /></div>}<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="px-5 py-2.5 text-left font-medium">Role</th>{MODULES.map((module) => <th key={module} className="px-3 py-2.5 text-center font-medium">{module}</th>)}</tr></thead><tbody className="divide-y divide-border">{USER_ROLES.map((userRole) => <tr key={userRole}><td className="px-5 py-2.5 font-medium">{ROLE_LABELS[userRole]}</td>{MODULES.map((module) => <td key={module} className="px-3 py-2.5 text-center"><Switch checked={permissions[userRole].includes(module)} disabled={!canEdit || userRole === "administrator"} onCheckedChange={(checked) => toggle(userRole, module, checked)} aria-label={`${ROLE_LABELS[userRole]} ${module} access`} /></td>)}</tr>)}</tbody></table></div></SectionCard>;
}

function SecurityPage() {
  const [mfa, setMfa] = useState(() => typeof window === "undefined" || window.localStorage.getItem("educore.security-mfa") !== "off");
  const [sessionLock, setSessionLock] = useState(() => typeof window === "undefined" || window.localStorage.getItem("educore.security-lock") !== "off");
  const toggle = (key: string, value: boolean, setter: (value: boolean) => void) => { setter(value); window.localStorage.setItem(key, value ? "on" : "off"); };
  return <AppShell><PageHeader title="Security" description="Control access, review sensitive actions and monitor connected school devices." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Security" }]} /><div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Protected roles" value="9" sub="Configured school roles" icon={ShieldCheck} /><KpiCard label="MFA policy" value={mfa ? "On" : "Off"} sub="Administrator accounts" icon={LockKeyhole} tone={mfa ? "success" : "warning"} /><KpiCard label="Active devices" value="2" sub="One service pending setup" icon={Smartphone} /><KpiCard label="Audit events" value="3" sub="Recent local events" icon={Clock3} /></div><div className="mt-6"><PermissionMatrix /></div><div className="mt-6 grid gap-4 xl:grid-cols-2"><SectionCard title="Security policy" description="These preferences apply to this browser until connected to Supabase authentication."><div className="divide-y divide-border"><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Require multi-factor authentication</p><p className="text-xs text-muted-foreground">Require a second factor for administrator access.</p></div><Switch checked={mfa} onCheckedChange={(value) => toggle("educore.security-mfa", value, setMfa)} /></div><div className="flex items-center justify-between gap-4 py-3"><div><p className="text-sm font-medium">Lock inactive sessions</p><p className="text-xs text-muted-foreground">Protect unattended finance and student records screens.</p></div><Switch checked={sessionLock} onCheckedChange={(value) => toggle("educore.security-lock", value, setSessionLock)} /></div></div></SectionCard><SectionCard title="Devices & sessions" description="Connected scanners and operator sessions." bodyClassName="p-0"><div className="divide-y divide-border"><div className="flex items-center justify-between px-5 py-3 text-sm"><div><p className="font-medium">Main Gate Scanner 02</p><p className="text-xs text-muted-foreground">QR scanner · Just now</p></div><span className="text-xs text-success">Online</span></div><div className="flex items-center justify-between px-5 py-3 text-sm"><div><p className="font-medium">Bursar workstation</p><p className="text-xs text-muted-foreground">Web session · 12 minutes ago</p></div><span className="text-xs text-success">Active</span></div><div className="flex items-center justify-between px-5 py-3 text-sm"><div><p className="font-medium">Fingerprint bridge</p><p className="text-xs text-muted-foreground">Biometric service · Not connected</p></div><span className="text-xs text-warning">Pending setup</span></div></div></SectionCard></div></AppShell>;
}
