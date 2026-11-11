export type AuditRecord = { id: string; action: string; actor: string; scope: string; occurredAt: string; category?: string };
const KEY = "educore.audit-log";
const RETENTION_KEY = "educore.audit-retention-days";
const CHANGE_EVENT = "educore:audit-log-changed";
function readAll() { if (typeof window === "undefined") return [] as AuditRecord[]; try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as AuditRecord[]; } catch { return []; } }
function prune(records: AuditRecord[]) { const days = Number(window.localStorage.getItem(RETENTION_KEY) ?? 365); const cutoff = Date.now() - Math.max(1, days) * 86400000; return records.filter((record) => new Date(record.occurredAt).getTime() >= cutoff); }
export function getAuditRetentionDays() { if (typeof window === "undefined") return 365; return Number(window.localStorage.getItem(RETENTION_KEY) ?? 365); }
export function setAuditRetentionDays(days: number) { window.localStorage.setItem(RETENTION_KEY, String(Math.max(1, Math.round(days)))); const records = prune(readAll()); window.localStorage.setItem(KEY, JSON.stringify(records)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function recordAudit(input: Omit<AuditRecord, "id" | "occurredAt">) { if (typeof window === "undefined") return; const records = [...prune(readAll()), { ...input, id: `AUD-${Date.now()}`, occurredAt: new Date().toISOString() }]; window.localStorage.setItem(KEY, JSON.stringify(records)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function getAuditRecords() { return prune(readAll()).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)); }
export { CHANGE_EVENT };
