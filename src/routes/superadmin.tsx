import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listPlatformSchools, approvePlatformSchool, listPlatformUsers, createPlatformUser, resetPlatformUserPassword, type PlatformSchool, type PlatformUser } from "@/lib/platform-api";
import { useRole } from "@/lib/role-context";
import { signOutFromServer } from "@/lib/identity-api";
import { toast } from "sonner";

export const Route = createFileRoute("/superadmin")({ component: SuperadminPage });

function SuperadminPage() {
  const navigate = useNavigate();
  const { role, authenticated, hydrated } = useRole();
  const [schools, setSchools] = useState<PlatformSchool[]>([]);
  const [error, setError] = useState<string>();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [email, setEmail] = useState("imageandkolors@gmail.com");
  const [displayName, setDisplayName] = useState("Image and Kolors");
  const [password, setPassword] = useState("");
  const [createdPassword, setCreatedPassword] = useState<string>();

  useEffect(() => {
    if (hydrated && !authenticated) {
      void navigate({ to: "/", search: { superadmin: "1" } });
      return;
    }
    if (hydrated && authenticated && role !== "superadmin") {
      void signOutFromServer().finally(() => navigate({ to: "/", search: { superadmin: "1" } }));
      return;
    }
    if (role !== "superadmin") return;
    Promise.all([listPlatformSchools(), listPlatformUsers()]).then(([nextSchools, nextUsers]) => { setSchools(nextSchools); setUsers(nextUsers); }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load platform data"));
  }, [authenticated, hydrated, navigate, role]);

  if (role !== "superadmin") return <AppShell><SectionCard title="Restricted" description="EduCore platform approval is limited to super administrators." /></AppShell>;

  return <AppShell>
    <PageHeader title="Superadmin" description="Approve and monitor schools across the EduCore platform." breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: "Superadmin" }]} />
    <SectionCard title="School approvals" description="Schools remain in trial until approved by the EduCore platform team.">
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      <div className="divide-y divide-border rounded-md border border-border">
        {schools.map((school) => <div key={school.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div><p className="font-medium">{school.name}</p><p className="text-xs text-muted-foreground">{school.slug}</p></div>
          <div className="flex items-center gap-3"><StatusBadge tone={school.status === "active" ? "success" : "warning"}>{school.status}</StatusBadge>{school.status !== "active" && <Button size="sm" onClick={() => approvePlatformSchool(school.id).then((updated) => { setSchools((current) => current.map((item) => item.id === updated.id ? updated : item)); toast.success(`${school.name} approved`); }).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : "Unable to approve school"))}>Approve school</Button>}</div>
        </div>)}
      </div>
    </SectionCard>
    <SectionCard title="Platform users" description="Create accounts with a one-time password. New and reset passwords must be changed at first sign-in.">
      <form className="grid gap-3 md:grid-cols-4" onSubmit={(event) => { event.preventDefault(); createPlatformUser({ email, displayName, password, platformRole: "user" }).then((user) => { setUsers((current) => [user, ...current]); setCreatedPassword(password); setPassword(""); toast.success("User created with a one-time password"); }).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : "Unable to create user")); }}>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" required />
        <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" required />
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" minLength={12} placeholder="One-time password" required />
        <Button type="submit">Create user</Button>
      </form>
      {createdPassword && <p className="mt-3 text-sm text-muted-foreground">One-time password created. Share it securely: <strong className="text-foreground">{createdPassword}</strong></p>}
      <div className="mt-5 divide-y divide-border rounded-md border border-border">
        {users.map((user) => <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"><div><p className="font-medium">{user.displayName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>{user.platformRole === "superadmin" ? <StatusBadge tone="success">Superadmin</StatusBadge> : <Button size="sm" variant="outline" onClick={() => { const nextPassword = window.prompt("Enter a temporary password (at least 12 characters)"); if (!nextPassword) return; resetPlatformUserPassword(user.id, nextPassword).then(() => toast.success("Password reset; user must change it at sign-in")).catch((reason: unknown) => toast.error(reason instanceof Error ? reason.message : "Unable to reset password")); }}>Reset password</Button>}</div>)}
      </div>
    </SectionCard>
  </AppShell>;
}