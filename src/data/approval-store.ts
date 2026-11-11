export type ApprovalRule = { id: string; area: "Academic" | "Finance" | "Student" | "Attendance"; primaryStaffId: string; secondaryStaffId?: string; updatedAt: string };
const KEY = "educore.approval-rules";
export function getApprovalRules(): ApprovalRule[] { if (typeof window === "undefined") return []; try { const value = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown; return Array.isArray(value) ? value as ApprovalRule[] : []; } catch { return []; } }
export function saveApprovalRules(rules: ApprovalRule[]) { window.localStorage.setItem(KEY, JSON.stringify(rules)); window.dispatchEvent(new Event("educore:approval-rules-changed")); }
