import { STUDENTS, type Student } from "@/data/school";

export type CbtAttempt = { sessionId: string; studentId: string; score: number; total: number; submittedAt: string; mode: "Practice" | "School CBT" };
export type CbtRegistration = { sessionId: string; studentId: string; registeredAt: string };

const REGISTRATION_KEY = "educore.cbt-registrations";
const ATTEMPT_KEY = "educore.cbt-attempts";
const CHANGE_EVENT = "educore:cbt-changed";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getCbtRegistrations(sessionId: string) {
  return read<CbtRegistration[]>(REGISTRATION_KEY, []).filter((item) => item.sessionId === sessionId);
}

export function registerCbtCandidates(sessionId: string, students: Student[]) {
  const existing = read<CbtRegistration[]>(REGISTRATION_KEY, []);
  const next = students.filter((student) => !existing.some((item) => item.sessionId === sessionId && item.studentId === student.id)).map((student) => ({ sessionId, studentId: student.id, registeredAt: new Date().toISOString() }));
  if (next.length) write(REGISTRATION_KEY, [...existing, ...next]);
  return existing.filter((item) => item.sessionId === sessionId).length + next.length;
}

export function getCbtAttempts(sessionId?: string) {
  const attempts = read<CbtAttempt[]>(ATTEMPT_KEY, []);
  return sessionId ? attempts.filter((attempt) => attempt.sessionId === sessionId) : attempts;
}

export function saveCbtAttempt(attempt: CbtAttempt) {
  write(ATTEMPT_KEY, [...read<CbtAttempt[]>(ATTEMPT_KEY, []), attempt]);
}

export function isCbtCandidate(sessionId: string, studentId: string) {
  return getCbtRegistrations(sessionId).some((item) => item.studentId === studentId);
}

export function getCbtChangeEvent() { return CHANGE_EVENT; }

export { STUDENTS };
