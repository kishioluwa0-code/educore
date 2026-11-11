import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/shell/app-shell";
import { PageHeader, SectionCard } from "@/components/kit/page";
import { StatusBadge } from "@/components/kit/status-badge";
import { Button } from "@/components/ui/button";

export function ModulePlaceholder({
  title,
  description,
  submodules,
}: {
  title: string;
  description: string;
  submodules: string[];
}) {
  return (
    <AppShell>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: "EduCore", to: "/dashboard" }, { label: title }]}
        actions={<StatusBadge tone="info">Scheduled for the next build phase</StatusBadge>}
      />
      <SectionCard title="Modules in this area">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {submodules.map((s) => (
            <li
              key={s}
              className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm"
            >
              <span>{s}</span>
              <span className="text-xs text-muted-foreground">Planned</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button asChild size="sm">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/people/students">Go to student management</Link>
          </Button>
        </div>
      </SectionCard>
    </AppShell>
  );
}
