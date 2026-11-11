import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRole } from "@/lib/role-context";
import { signInToServer, signOutFromServer } from "@/lib/identity-api";
import { getServerSchoolSetup } from "@/lib/school-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — EduCore School Operating System" },
      {
        name: "description",
        content:
          "Secure sign-in to EduCore, the school operating system for Nigerian nursery, primary and secondary schools.",
      },
      { property: "og:title", content: "EduCore — School Operating System" },
      {
        property: "og:description",
        content:
          "Admissions, attendance, assessment, examinations and finance for Nigerian schools.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setPrincipal } = useRole();
  const [superadminMode] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("superadmin") === "1");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-navy p-12 text-navy-foreground lg:flex">
        <div className="flex h-48 w-full items-center overflow-hidden">
          <img
            src="/educorelogo.png"
            alt="EduCore"
            className="h-48 w-auto max-w-none object-contain object-center"
            style={{ transform: "scale(3)", transformOrigin: "center" }}
          />
        </div>

        <div className="max-w-lg space-y-6">
          <h1 className="text-4xl leading-tight font-semibold">
            The operating system for Nigerian schools.
          </h1>
          <p className="text-navy-foreground/70">
            Admissions, curriculum, continuous assessment, WAEC and BECE workflows, attendance,
            identity cards and fees — governed by permissions and a complete audit trail.
          </p>
          <dl className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            {[
              ["Set up", "Students managed"],
              ["No data", "Attendance capture"],
              ["No data", "Termly billing"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="tabular text-2xl font-semibold">{value}</dt>
                <dd className="text-xs text-navy-foreground/60">{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="flex items-center gap-2 text-xs text-navy-foreground/60">
          <ShieldCheck className="size-4" aria-hidden /> Role-based access · Audit logged ·
          Offline-tolerant
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm space-y-7">
          <div className="space-y-1.5">
            <div className="mb-6 flex h-48 w-full items-center justify-center overflow-hidden lg:hidden">
              <img
                src="/educorelogo.png"
                alt="EduCore"
                className="h-48 w-auto max-w-none object-contain object-center"
                style={{ transform: "scale(3)", transformOrigin: "center" }}
              />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">{superadminMode ? "Superadmin sign in" : "Sign in to your school"}</h2>
            <p className="text-sm text-muted-foreground">{superadminMode ? "Sign in to the EduCore platform administration dashboard" : "Sign in to your EduCore school workspace"}</p>
          </div>

          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setLoading(true);
              setError(undefined);
              try {
                const result = await signInToServer({ email, password });
                if (superadminMode && result.principal.platformRole !== "superadmin") {
                  await signOutFromServer();
                  throw new Error("This account is not a platform superadmin account");
                }
                setPrincipal(result.principal);
                if (result.principal.platformRole === "superadmin") {
                  await navigate({ to: "/superadmin" });
                  return;
                }
                const setup = await getServerSchoolSetup().catch(() => null);
                await navigate({ to: setup?.status === "active" && setup.setup?.setupStep === 5 ? "/dashboard" : "/setup" });
              } catch (caught) {
                setError(
                  caught instanceof Error ? caught.message : "Unable to sign in. Please try again.",
                );
              } finally {
                setLoading(false);
              }
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Staff email or ID</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            New school? <Link className="text-primary hover:underline" to="/register-school">Register your school</Link>
          </p>
          {loading && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-8 py-7 shadow-card">
                <img
                  src="/favicon.png"
                  alt=""
                  className="size-12 animate-pulse rounded-md object-cover"
                />
                <span className="text-sm font-medium">Signing in securely</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              Sign-in attempts are audit logged. New devices require verification by a school
              administrator.
            </p>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Platform administrator?{" "}
            <Link to="/" onClick={(event) => { event.preventDefault(); void signOutFromServer().finally(() => { window.location.href = "/?superadmin=1"; }); }} className="text-primary hover:underline">
              Superadmin access
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
