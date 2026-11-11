import type { Student } from "@/data/school";

export type MovementDecision = "Promote" | "Retain" | "Graduate";
export type StudentMovement = { studentId: string; decision: MovementDecision; nextLevel?: string; decidedBy: string; decidedAt: string; reason?: string };
const STORAGE_KEY = "educore.student-movements";
const CHANGE_EVENT = "educore:student-movements-changed";
const NEXT_LEVEL: Record<string, string> = { "Primary 1": "Primary 2", "Primary 2": "Primary 3", "Primary 3": "Primary 4", "Primary 4": "Primary 5", "Primary 5": "Primary 6", "JSS 1": "JSS 2", "JSS 2": "JSS 3", "JSS 3": "SS 1", "SS 1": "SS 2", "SS 2": "SS 3" };

function readAll() {
  if (typeof window === "undefined") return [] as StudentMovement[];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as StudentMovement[]; } catch { return []; }
}

function writeAll(movements: StudentMovement[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function recommendedMovement(student: Student): { decision: MovementDecision; nextLevel?: string; reason: string } {
  if (student.level === "SS 3") return { decision: "Graduate", reason: "Final senior secondary level" };
  if (student.average < 50 || student.attendanceRate < 75) return { decision: "Retain", nextLevel: student.level, reason: student.average < 50 ? "Average below 50%" : "Attendance below 75%" };
  return { decision: "Promote", nextLevel: NEXT_LEVEL[student.level], reason: "Meets average and attendance thresholds" };
}

export function getStudentMovements() { return readAll(); }

export function saveStudentMovement(studentId: string, decision: MovementDecision, decidedBy: string, nextLevel?: string, reason?: string) {
  const movements = readAll().filter((movement) => movement.studentId !== studentId);
  writeAll([...movements, { studentId, decision, nextLevel, decidedBy, decidedAt: new Date().toISOString(), reason }]);
}

export function useStudentMovements() {
  const [movements, setMovements] = useState<StudentMovement[]>(readAll);
  useEffect(() => { const refresh = () => setMovements(readAll()); window.addEventListener(CHANGE_EVENT, refresh); window.addEventListener("storage", refresh); return () => { window.removeEventListener(CHANGE_EVENT, refresh); window.removeEventListener("storage", refresh); }; }, []);
  return movements;
}

import { useEffect, useState } from "react";
export { CHANGE_EVENT };
