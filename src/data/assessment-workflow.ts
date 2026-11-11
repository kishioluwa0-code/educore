import { CLASSES, SUBJECTS } from "@/data/academics";
import { useEffect, useState } from "react";

export type AssessmentRole = "Administrator" | "Teacher" | "Principal" | "Examination Officer";
export type AssessmentAssignment = {
  id: string;
  teacherId: string;
  teacherName: string;
  classId: string;
  subjectCode: string;
  active: boolean;
};

const STORAGE_KEY = "educore.assessment-assignments";
const CHANGE_EVENT = "educore:assessment-assignments-changed";

const SEEDED_ASSIGNMENTS: AssessmentAssignment[] = [
  { id: "ASN-001", teacherId: "STF-0102", teacherName: "Mr. Sunday Okafor", classId: "C-JS2A", subjectCode: "MTH", active: true },
  { id: "ASN-002", teacherId: "STF-0102", teacherName: "Mr. Sunday Okafor", classId: "C-JS2A", subjectCode: "ENG", active: true },
  { id: "ASN-003", teacherId: "STF-0118", teacherName: "Mr. John Adeyinka", classId: "C-SS3A", subjectCode: "PHY", active: true },
];

function readAssignments() {
  if (typeof window === "undefined") return SEEDED_ASSIGNMENTS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AssessmentAssignment[]) : SEEDED_ASSIGNMENTS;
  } catch {
    return SEEDED_ASSIGNMENTS;
  }
}

function writeAssignments(assignments: AssessmentAssignment[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAssignments() {
  return readAssignments();
}

export function isAssigned(role: AssessmentRole, classId: string, subjectCode: string) {
  return role === "Administrator" || role === "Principal" || role === "Examination Officer" || readAssignments().some((assignment) => assignment.active && assignment.classId === classId && assignment.subjectCode === subjectCode);
}

export function assignTeacher(input: Omit<AssessmentAssignment, "id" | "active">) {
  const assignments = readAssignments();
  const exists = assignments.some((assignment) => assignment.teacherId === input.teacherId && assignment.classId === input.classId && assignment.subjectCode === input.subjectCode);
  if (exists) return;
  writeAssignments([...assignments, { ...input, id: `ASN-${Date.now()}`, active: true }]);
}

export function assignmentOptions() {
  return { classes: CLASSES, subjects: SUBJECTS };
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>(readAssignments);
  useEffect(() => {
    const refresh = () => setAssignments(readAssignments());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return assignments;
}

export { CHANGE_EVENT };