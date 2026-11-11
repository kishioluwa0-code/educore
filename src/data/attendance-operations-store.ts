import { STAFF, type Student } from "@/data/school";
import { useEffect, useState } from "react";

export type TeacherAttendance = { staffId: string; status: "Present" | "Late" | "Absent"; arrivalTime: string; date: string; note?: string };
export type GuardianContact = { id: string; studentId: string; guardianId: string; outcome: "Contacted" | "No answer" | "Wrong number"; note: string; contactedBy: string; contactedAt: string };
const TEACHER_KEY = "educore.teacher-attendance";
const CONTACT_KEY = "educore.guardian-contacts";
const CHANGE_EVENT = "educore:attendance-operations-changed";
function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) as T; } catch { return fallback; } }
function write<T>(key: string, value: T) { window.localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
export function getTeacherAttendance() { return read<TeacherAttendance[]>(TEACHER_KEY, STAFF.filter((member) => member.role.toLowerCase().includes("teacher")).map((member, index) => ({ staffId: member.id, status: index === 2 ? "Late" : "Present", arrivalTime: index === 2 ? "08:21" : "07:42", date: new Date().toISOString().slice(0, 10) }))); }
export function saveTeacherAttendance(record: Omit<TeacherAttendance, "date">) { const next = getTeacherAttendance().filter((item) => item.staffId !== record.staffId); write(TEACHER_KEY, [...next, { ...record, date: new Date().toISOString().slice(0, 10) }]); }
export function getRepeatedAttendanceAlerts() { return getTeacherAttendance().filter((record) => record.status === "Late" || record.status === "Absent").map((record) => ({ ...record, occurrences: record.status === "Late" ? 3 : 2, message: record.status === "Late" ? "Repeated lateness requires follow-up" : "Repeated absence requires follow-up" })); }
export function getGuardianContacts(studentId?: string) { const contacts = read<GuardianContact[]>(CONTACT_KEY, []); return studentId ? contacts.filter((item) => item.studentId === studentId) : contacts; }
export function recordGuardianContact(student: Student, outcome: GuardianContact["outcome"], note: string, contactedBy: string) { const guardian = student.guardians.find((item) => item.primary) ?? student.guardians[0]; if (!guardian) return false; write(CONTACT_KEY, [...getGuardianContacts(), { id: `GCT-${Date.now()}`, studentId: student.id, guardianId: guardian.id, outcome, note, contactedBy, contactedAt: new Date().toISOString() }]); return true; }
export function useAttendanceOperations() { const [, refresh] = useState(0); useEffect(() => { const update = () => refresh((value) => value + 1); window.addEventListener(CHANGE_EVENT, update); window.addEventListener("storage", update); return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener("storage", update); }; }, []); return { teachers: getTeacherAttendance(), alerts: getRepeatedAttendanceAlerts(), contacts: getGuardianContacts() }; }
