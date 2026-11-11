import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/register-school")({ component: RegisterSchoolPage });

function RegisterSchoolPage() {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState(false);
  const [saving, setSaving] = useState(false);

  return <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12"><form className="w-full max-w-md space-y-5 rounded-lg border border-border bg-surface p-6 shadow-card" onSubmit={async (event) => {
    event.preventDefault(); setSaving(true); setError(undefined);
    try {
      const response = await fetch("/api/school/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schoolName, adminName, email, password }) });
      if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new Error(body?.message ?? "Unable to register school"); }
      setCreated(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to register school"); } finally { setSaving(false); }
  }}>
    {created ? <div className="space-y-5 text-center"><div><h1 className="text-2xl font-semibold">School created successfully</h1><p className="mt-2 text-sm text-muted-foreground">Your school workspace is ready for onboarding. The administrator login is <strong className="text-foreground">{email}</strong>.</p></div><div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-left text-sm"><p className="font-medium">Next step</p><p className="mt-1 text-muted-foreground">Sign in with the administrator email and password you just created. Complete school setup, then wait for platform approval before opening the dashboard.</p></div><Button type="button" className="w-full" onClick={() => navigate({ to: "/" })}>Go to sign in</Button></div> : <>
    <div><h1 className="text-2xl font-semibold">Register your school</h1><p className="mt-1 text-sm text-muted-foreground">Create the first administrator login, then complete onboarding.</p></div>
    <div className="space-y-1.5"><Label htmlFor="school-name">School name</Label><Input id="school-name" value={schoolName} onChange={(event) => setSchoolName(event.target.value)} required /></div>
    <div className="space-y-1.5"><Label htmlFor="admin-name">Administrator name</Label><Input id="admin-name" value={adminName} onChange={(event) => setAdminName(event.target.value)} required /></div>
    <div className="space-y-1.5"><Label htmlFor="admin-email">Administrator email</Label><Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
    <div className="space-y-1.5"><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} required /><p className="text-xs text-muted-foreground">Use at least 12 characters.</p></div>
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    <Button type="submit" className="w-full" disabled={saving}>{saving ? "Creating school…" : "Create school workspace"}</Button>
    <p className="text-center text-sm text-muted-foreground"><Link className="text-primary hover:underline" to="/">Back to sign in</Link></p></>}
  </form></main>;
}