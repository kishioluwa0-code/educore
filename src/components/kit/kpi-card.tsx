import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  sub,
  delta,
  icon: Icon,
  to,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: { value: string; direction: "up" | "down"; good?: boolean };
  icon: LucideIcon;
  to?: string;
  tone?: "default" | "warning" | "danger";
}) {
  const Wrapper = (to ? Link : "div") as React.ElementType;
  return (
    <Wrapper
      {...(to ? { to } : {})}
      className={cn(
        "group flex flex-col justify-between gap-3 rounded-lg border border-border bg-surface p-4 shadow-card transition-colors",
        to && "hover:border-primary/40",
        tone === "warning" && "border-warning/35",
        tone === "danger" && "border-danger/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground",
            tone === "warning" && "border-warning/30 bg-warning-soft text-warning-foreground",
            tone === "danger" && "border-danger/25 bg-danger-soft text-danger",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div>
        <p className="tabular text-2xl font-semibold tracking-tight md:text-[26px]">{value}</p>
        <div className="mt-1 flex items-center gap-2">
          {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          {delta && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                delta.good === false ? "text-danger" : "text-success",
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUpRight className="size-3.5" aria-hidden />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden />
              )}
              {delta.value}
            </span>
          )}
        </div>
      </div>
    </Wrapper>
  );
}
