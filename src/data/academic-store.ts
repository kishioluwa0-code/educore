import { useEffect, useState } from "react";

export type AcademicAssignment = {
  id: string;
  classId: string;
  subjectCode: string;
  teacher: string;
  updatedAt: string;
};

export type ClassTeacherAssignment = {
  id: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  section: "Primary";
  session: string;
  term: string;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  assignedBy: string;
  assignedAt: string;
};

export type TimetableOverride = {
  id: string;
  classId: string;
  day: string;
  period: number;
  subjectCode: string;
};

const STORAGE_KEY = "educore.academic-assignments";
const CHANGE_EVENT = "educore:academic-assignments-changed";
const TIMETABLE_KEY = "educore.timetable-overrides";
const CLASS_TEACHER_KEY = "educore.class-teacher-assignments";

function readAssignments() {
  if (typeof window === "undefined") return [] as AcademicAssignment[];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? (JSON.parse(stored) as AcademicAssignment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAssignments(assignments: AcademicAssignment[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAcademicAssignments() {
  return readAssignments();
}

export function saveAcademicAssignment(input: Omit<AcademicAssignment, "id" | "updatedAt">) {
  const assignments = readAssignments();
  const existing = assignments.find(
    (assignment) => assignment.classId === input.classId && assignment.subjectCode === input.subjectCode,
  );
  const assignment: AcademicAssignment = {
    ...input,
    id: existing?.id ?? `ASN-${Date.now()}`,
    updatedAt: new Date().toISOString(),
  };
  writeAssignments([...assignments.filter((item) => item.id !== existing?.id), assignment]);
  return assignment;
}

export function useAcademicAssignments() {
  const [assignments, setAssignments] = useState<AcademicAssignment[]>(getAcademicAssignments);
  useEffect(() => {
    const refresh = () => setAssignments(getAcademicAssignments());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return assignments;
}

function readClassTeacherAssignments() {
  if (typeof window === "undefined") return [] as ClassTeacherAssignment[];
  try {
    const stored = window.localStorage.getItem(CLASS_TEACHER_KEY);
    const parsed = stored ? (JSON.parse(stored) as ClassTeacherAssignment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getClassTeacherAssignments() {
  return readClassTeacherAssignments();
}

export function getActiveClassTeacherAssignments(teacherId: string, session: string, term: string) {
  return readClassTeacherAssignments().filter(
    (assignment) =>
      assignment.teacherId === teacherId &&
      assignment.session === session &&
      assignment.term === term &&
      assignment.active,
  );
}

export function saveClassTeacherAssignment(
  input: Omit<ClassTeacherAssignment, "id" | "assignedAt" | "section">,
  actor: string,
) {
  if (actor !== "administrator" && actor !== "principal") return null;
  const assignments = readClassTeacherAssignments();
  if (!input.classId || !input.teacherId || !input.session || !input.term || !input.effectiveFrom) return null;
  const existing = assignments.find(
    (assignment) =>
      assignment.classId === input.classId &&
      assignment.session === input.session &&
      assignment.term === input.term,
  );
  const activeExisting = existing?.active ? existing : undefined;
  const now = new Date().toISOString();
  const closed = activeExisting
    ? { ...activeExisting, active: false, effectiveTo: input.effectiveFrom, assignedAt: activeExisting.assignedAt }
    : undefined;
  const assignment: ClassTeacherAssignment = {
    ...input,
    id: `CTA-${Date.now()}`,
    section: "Primary",
    assignedAt: now,
  };
  window.localStorage.setItem(
    CLASS_TEACHER_KEY,
    JSON.stringify([
      ...assignments.filter((item) => item.id !== activeExisting?.id && item.id !== existing?.id),
      ...(closed ? [closed] : existing ? [{ ...existing, active: false }] : []),
      assignment,
    ]),
  );
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return assignment;
}

export function getClassTeacherAssignmentHistory(classId: string, session: string, term: string) {
  return readClassTeacherAssignments()
    .filter((assignment) => assignment.classId === classId && assignment.session === session && assignment.term === term)
    .sort((a, b) => b.assignedAt.localeCompare(a.assignedAt));
}

export function deactivateClassTeacherAssignment(classId: string, session: string, term: string, actor: string) {
  if (actor !== "administrator" && actor !== "principal") return null;
  const assignments = readClassTeacherAssignments();
  const existing = assignments.find(
    (assignment) =>
      assignment.classId === classId &&
      assignment.session === session &&
      assignment.term === term &&
      assignment.active,
  );
  if (!existing) return null;
  const updated = { ...existing, active: false, effectiveTo: new Date().toISOString().slice(0, 10) };
  window.localStorage.setItem(
    CLASS_TEACHER_KEY,
    JSON.stringify([...assignments.filter((item) => item.id !== existing.id), updated]),
  );
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return updated;
}

export function canTeacherAccessClass(teacherId: string, classId: string, session: string, term: string) {
  return getActiveClassTeacherAssignments(teacherId, session, term).some(
    (assignment) => assignment.classId === classId,
  );
}

export function useClassTeacherAssignments() {
  const [assignments, setAssignments] = useState<ClassTeacherAssignment[]>(getClassTeacherAssignments);
  useEffect(() => {
    const refresh = () => setAssignments(getClassTeacherAssignments());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return assignments;
}

function readTimetableOverrides() {
  if (typeof window === "undefined") return [] as TimetableOverride[];
  try {
    const stored = window.localStorage.getItem(TIMETABLE_KEY);
    const parsed = stored ? (JSON.parse(stored) as TimetableOverride[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveTimetableOverride(input: Omit<TimetableOverride, "id">) {
  const overrides = readTimetableOverrides();
  const existing = overrides.find((item) => item.classId === input.classId && item.day === input.day && item.period === input.period);
  const override = { ...input, id: existing?.id ?? `TTO-${Date.now()}` };
  window.localStorage.setItem(TIMETABLE_KEY, JSON.stringify([...overrides.filter((item) => item.id !== existing?.id), override]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return override;
}

export function useTimetableOverrides() {
  const [overrides, setOverrides] = useState<TimetableOverride[]>(readTimetableOverrides);
  useEffect(() => {
    const refresh = () => setOverrides(readTimetableOverrides());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return overrides;
}
