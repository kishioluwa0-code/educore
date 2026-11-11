import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/components/nav-config";
import { SCHOOL, SESSIONS, TERMS } from "@/data/school";
import { GlobalSearch } from "@/components/shell/global-search";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAcademicContext } from "@/lib/academic-context";
import { ROLE_LABELS, useRole } from "@/lib/role-context";
import { RestrictedState } from "@/components/kit/page";
import { getProfile } from "@/lib/role-profiles";
import { getServerSchoolSetup } from "@/lib/school-api";

function SidebarNav({
  collapsed,
  onNavigate,
  role,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  role: keyof typeof ROLE_LABELS;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <ScrollArea className="h-full">
      <nav className="space-y-5 px-3 py-4" aria-label="Main">
        {NAV.map((section) => (
          <div key={section.group}>
            {!collapsed && (
              <p className="px-2 pb-1.5 text-[10px] font-semibold tracking-widest text-sidebar-foreground/50 uppercase">
                {section.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items
                .filter((item) => !item.roles || item.roles.includes(role))
                .map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <li key={item.label}>
                      <Link
                        to={item.to}
                        onClick={onNavigate}
                        title={collapsed ? item.label : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm text-sidebar-foreground/85 transition-colors outline-none",
                          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                          active &&
                            "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {!collapsed && item.badge ? (
                          <span className="tabular ml-auto rounded-full bg-sidebar-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-sidebar-primary">
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                      {!collapsed && active && item.children && (
                        <ul className="mt-0.5 mb-1 ml-[22px] space-y-0.5 border-l border-sidebar-border pl-3">
                          {item.children
                            .filter((child) => !child.roles || child.roles.includes(role))
                            .map((child) => (
                              <li key={child.label}>
                                <Link
                                  to={child.to}
                                  onClick={onNavigate}
                                  className={cn(
                                    "block rounded-md px-2 py-1.5 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                    pathname === child.to && "text-sidebar-primary",
                                  )}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
    </ScrollArea>
  );
}

function Logo({ compact, schoolName, logoUrl }: { compact?: boolean; schoolName?: string; logoUrl?: string | null }) {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5 outline-none">
      <img
        src={logoUrl || (compact ? "/favicon.png" : "/educoremain.png")}
        alt="EduCore"
        className={
          compact
            ? "size-8 shrink-0 rounded-md object-cover"
            : "h-16 w-auto max-w-[360px] object-contain"
        }
      />
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">EduCore</span>
          <span className="text-[11px] text-muted-foreground">{schoolName || SCHOOL.name}</span>
        </span>
      )}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { session, term, setSession, setTerm } = useAcademicContext();
  const { role, profileId, principal, authenticated, hydrated, signOut } = useRole();
  const [schoolBrand, setSchoolBrand] = useState<{ name: string; logoUrl: string | null }>({ name: SCHOOL.name, logoUrl: null });
  const activeProfile = getProfile(role, profileId);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
    useEffect(() => {
      if (role === "superadmin") return;
      getServerSchoolSetup().then((setup) => setSchoolBrand({ name: setup.name, logoUrl: setup.setup?.logoUrl ?? null })).catch(() => undefined);
    }, [role]);
  const routeRoles: Record<string, string[]> = {
    "/dashboard": ["administrator", "principal", "teacher", "bursar", "examinations", "hr", "security", "parent", "student"],
    "/superadmin": ["superadmin"],
    "/setup": ["administrator"],
    "/settings": ["administrator"],
    "/security": ["administrator", "principal", "security"],
    "/operations": ["administrator", "principal", "hr", "security"],
    "/finance/payments": ["administrator", "principal", "bursar"],
    "/finance/fees": ["administrator", "principal", "bursar"],
    "/finance": ["administrator", "principal", "bursar", "parent", "student"],
    "/reports": ["administrator", "principal", "bursar", "examinations", "hr"],
    "/people/students/new": ["administrator", "principal", "hr"],
    "/people/staff/new": ["administrator", "principal", "hr"],
    "/people/students/ids": ["administrator", "principal", "hr"],
    "/academics": ["administrator", "principal", "teacher", "examinations", "student"],
    "/assessment": ["administrator", "principal", "teacher", "examinations", "student", "parent"],
    "/examinations": ["administrator", "principal", "teacher", "examinations", "student", "parent"],
    "/attendance": ["administrator", "principal", "teacher", "hr", "security", "parent", "student"],
    "/communication": [
      "administrator",
      "principal",
      "teacher",
      "hr",
      "security",
      "parent",
      "student",
    ],
    "/people": ["administrator", "principal", "teacher", "hr", "parent", "student"],
  };
  const matchedRoute = Object.keys(routeRoles)
    .sort((a, b) => b.length - a.length)
    .find((route) => pathname === route || pathname.startsWith(`${route}/`));
  const broadStudentRegister =
    pathname === "/people/students" && ["parent", "student"].includes(role);
  const restricted =
    hydrated &&
    (pathname !== "/setup" && !authenticated ||
      broadStudentRegister ||
      (matchedRoute ? !routeRoles[matchedRoute]!.includes(role) : false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
          collapsed ? "w-[68px]" : "w-[264px]",
        )}
      >
        <div
          className={cn(
            "flex h-20 items-center border-b border-sidebar-border px-4",
            collapsed && "justify-center px-0",
          )}
        >
          <span className="text-sidebar-foreground">
            {collapsed ? (
              <img src={schoolBrand.logoUrl || "/favicon.png"} alt={schoolBrand.name} className="size-8 rounded-md object-cover" />
            ) : (
              <div className="flex h-20 w-full items-center overflow-hidden">
                <img
                  src={schoolBrand.logoUrl || "/educoremain.png"}
                  alt={schoolBrand.name}
                  className="h-20 w-full max-w-none object-contain object-center"
                  style={{ transform: "scale(2.4)", transformOrigin: "center" }}
                />
              </div>
            )}
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarNav collapsed={collapsed} role={role} />
        </div>
        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="mx-auto size-4" aria-hidden />
            ) : (
              <>
                <PanelLeftClose className="size-4" aria-hidden /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-navy/60"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex h-full w-[276px] flex-col bg-sidebar text-sidebar-foreground">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-sm font-semibold text-sidebar-accent-foreground">EduCore</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} role={role} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur">
          <button
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="lg:hidden">
            <Logo compact schoolName={schoolBrand.name} logoUrl={schoolBrand.logoUrl} />
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 max-w-md min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 md:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="truncate">Search students, staff, invoices…</span>
            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button className="md:hidden" onClick={() => setSearchOpen(true)} aria-label="Search">
              <Search className="size-5" />
            </button>

            <div className="hidden items-center gap-1.5 xl:flex">
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Academic session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={term} onValueChange={setTerm}>
                <SelectTrigger className="h-8 w-[125px] text-xs" aria-label="Term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERMS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative size-9"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-danger ring-2 ring-surface" />
            </Button>
            <Button variant="ghost" size="icon" className="size-9" aria-label="Help">
              <HelpCircle className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-left transition-colors hover:bg-muted">
                  <span className="flex size-7 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-navy-foreground">
                    FA
                  </span>
                  <span className="hidden leading-tight sm:flex sm:flex-col">
                    <span className="text-xs font-medium">
                      {principal?.displayName ?? activeProfile?.label ?? "Administrator"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ShieldCheck className="size-3" aria-hidden /> {ROLE_LABELS[role]}
                    </span>
                  </span>
                  <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Signed in as {ROLE_LABELS[role]}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>My profile</DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">School settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/security">Security centre</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="text-danger focus:text-danger">
                  <Link to="/" onClick={signOut}>
                    <LogOut className="size-4" /> Sign out
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
            {!hydrated ? (
              <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
                Loading EduCore…
              </div>
            ) : restricted ? (
              <RestrictedState action="view this area" />
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
