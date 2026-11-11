import { Link } from "@tanstack/react-router";
import { ChevronRight, Inbox, AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
      {items.map((item, i) => (
        <span key={item.label} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 opacity-60" aria-hidden />}
          {item.to ? (
            <Link to={item.to} className="rounded hover:text-foreground hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-1.5">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-border bg-surface shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-3.5">
          <div>
            {title && <h2 className="text-sm font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load this information",
  description = "Something interrupted the request. Check your connection and try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-md border border-danger/25 bg-danger-soft text-danger">
        <AlertTriangle className="size-5" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function RestrictedState({ action = "perform this action" }: { action?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/60 px-4 py-3">
      <Lock className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
      <div className="text-sm">
        <p className="font-medium">You don't have permission to {action}.</p>
        <p className="text-muted-foreground">
          Ask a school administrator to grant the required role permission.
        </p>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-5">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-6" />
          ))}
        </div>
      ))}
    </div>
  );
}
