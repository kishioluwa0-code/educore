export function naira(value: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    if (Math.abs(value) >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  }
  return `₦${value.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
