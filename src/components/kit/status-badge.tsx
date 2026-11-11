import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "teal";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-border",
  success: "bg-success-soft text-success border-success/25",
  warning: "bg-warning-soft text-warning-foreground border-warning/35",
  danger: "bg-danger-soft text-danger border-danger/25",
  info: "bg-info-soft text-info border-info/25",
  teal: "bg-accent text-accent-foreground border-teal/25",
};

export function StatusBadge({
  children,
  tone = "neutral",
  dot = true,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden />}
      {children}
    </span>
  );
}

export function attendanceTone(state: string): Tone {
  return state === "Present"
    ? "success"
    : state === "Absent"
      ? "danger"
      : state === "Late"
        ? "warning"
        : "info";
}

export function academicTone(state: string): Tone {
  return state === "Distinction"
    ? "teal"
    : state === "On track"
      ? "success"
      : state === "Needs support"
        ? "warning"
        : "danger";
}

export function gradeBookTone(state: string): Tone {
  return state === "Published"
    ? "success"
    : state === "Approved"
      ? "teal"
    : state === "Submitted"
      ? "info"
      : state === "Correction requested"
        ? "danger"
      : state === "Draft"
        ? "warning"
        : "neutral";
}
