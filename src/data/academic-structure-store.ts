import { useEffect, useState } from "react";
import { CLASSES, SUBJECTS, type ClassRow, type Subject } from "@/data/academics";
import type { AcademicAssignment, TimetableOverride } from "@/data/academic-store";

export type AcademicCalendarEntry = { id: string; title: string; starts: string; ends: string; type: "Term" | "Examination" | "Holiday" | "Event" };
export type CurriculumOwner = { scheme: string; owner: string; updatedAt: string };
const SUBJECT_KEY = "educore.academic-subjects";
const CLASS_KEY = "educore.academic-classes";
const CALENDAR_KEY = "educore.academic-calendar";
const OWNER_KEY = "educore.curriculum-owners";
const CHANGE_EVENT = "educore:academic-structure-changed";
function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; } }
function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function getAcademicSubjects() { return [...SUBJECTS, ...read<Subject[]>(SUBJECT_KEY, [])]; }
export function getAcademicClasses() { return [...CLASSES, ...read<ClassRow[]>(CLASS_KEY, [])]; }
export function createAcademicSubject(subject: Subject) { const next = read<Subject[]>(SUBJECT_KEY, []); if (getAcademicSubjects().some((item) => item.code === subject.code)) return false; write(SUBJECT_KEY, [...next, subject]); return true; }
export function createAcademicClass(arm: ClassRow) { const next = read<ClassRow[]>(CLASS_KEY, []); if (getAcademicClasses().some((item) => item.id === arm.id)) return false; write(CLASS_KEY, [...next, arm]); return true; }
export function getCalendarEntries() { return read<AcademicCalendarEntry[]>(CALENDAR_KEY, [{ id: "CAL-001", title: "First Term", starts: "2026-09-14", ends: "2026-12-11", type: "Term" }, { id: "CAL-002", title: "Mid-term examination", starts: "2026-10-26", ends: "2026-10-30", type: "Examination" }]); }
export function saveCalendarEntry(entry: Omit<AcademicCalendarEntry, "id">) { write(CALENDAR_KEY, [...getCalendarEntries(), { ...entry, id: `CAL-${Date.now()}` }]); }
export function getCurriculumOwners() { return read<CurriculumOwner[]>(OWNER_KEY, []); }
export function saveCurriculumOwner(scheme: string, owner: string) { write(OWNER_KEY, [...getCurriculumOwners().filter((item) => item.scheme !== scheme), { scheme, owner, updatedAt: new Date().toISOString() }]); }
export function getTeacherWorkload(assignments: AcademicAssignment[]) { return Object.entries(assignments.reduce<Record<string, number>>((counts, assignment) => ({ ...counts, [assignment.teacher]: (counts[assignment.teacher] ?? 0) + 1 }), {})).map(([teacher, assignmentsCount]) => ({ teacher, assignments: assignmentsCount })); }
export function getAssignmentConflicts(assignments: AcademicAssignment[]) { return assignments.filter((assignment, index) => assignments.some((other, otherIndex) => otherIndex !== index && other.teacher === assignment.teacher && other.classId === assignment.classId && other.subjectCode === assignment.subjectCode)); }
export function getTimetableClashes(classes: ClassRow[], assignments: AcademicAssignment[], overrides: TimetableOverride[]) { const clashes: string[] = []; const slots = new Map<string, string>(); classes.forEach((classRow) => { const timetable = overrides.filter((item) => item.classId === classRow.id); timetable.forEach((slot) => { const teacher = assignments.find((item) => item.classId === classRow.id && item.subjectCode === slot.subjectCode)?.teacher; if (!teacher) return; const key = `${teacher}:${slot.day}:${slot.period}`; const existing = slots.get(key); if (existing && existing !== classRow.id) clashes.push(`${teacher} · ${slot.day} ${slot.period + 1}`); else slots.set(key, classRow.id); }); }); return [...new Set(clashes)]; }
export function useAcademicStructure() { const [, refresh] = useState(0); useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener(CHANGE_EVENT, update); window.addEventListener("storage", update); return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener("storage", update); }; }, []); return { subjects: getAcademicSubjects(), classes: getAcademicClasses(), calendar: getCalendarEntries(), owners: getCurriculumOwners() }; }
export { CHANGE_EVENT };
