import { useEffect, useState } from "react";
import { registerFor, type MarkState } from "@/data/academics";

export type AttendanceStatus = "Draft" | "Submitted" | "Approved" | "Returned";
export type FollowUpState = "Open" | "Contacted" | "Resolved";
export type AttendanceFollowUp = { studentId: string; state: FollowUpState; owner?: string; note?: string; updatedAt: string };
type AttendanceEntry = { marks: Record<string, MarkState>; status: AttendanceStatus; updatedAt: string; reviewedAt?: string; reviewedBy?: string; returnReason?: string; followUps?: AttendanceFollowUp[] };

const STORAGE_KEY = "educore.attendance";
const CHANGE_EVENT = "educore:attendance-changed";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readAll(): Record<string, AttendanceEntry> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, AttendanceEntry>;
  } catch {
    return {};
  }
}

function key(classId: string) {
  return `${todayKey()}:${classId}`;
}

function writeAll(records: Record<string, AttendanceEntry>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAttendance(classId: string, level: string) {
  const stored = readAll()[key(classId)];
  const defaults = Object.fromEntries(registerFor(level).map((row) => [row.student.id, row.state]));
  return stored ?? { marks: defaults, status: "Draft" as const, updatedAt: todayKey(), followUps: [] };
}

export function saveAttendance(classId: string, marks: Record<string, MarkState>, status: AttendanceStatus = "Draft") {
  const records = readAll();
  const previous = records[key(classId)];
  const existingFollowUps = previous?.followUps ?? [];
  const followUps = Object.entries(marks)
    .filter(([, state]) => state === "Absent")
    .map(([studentId]) => existingFollowUps.find((item) => item.studentId === studentId) ?? { studentId, state: "Open" as const, updatedAt: new Date().toISOString() });
  records[key(classId)] = { marks, status, updatedAt: new Date().toISOString(), followUps };
  writeAll(records);
}

export function updateAttendanceFollowUp(classId: string, studentId: string, state: FollowUpState, owner: string) {
  const records = readAll();
  const existing = records[key(classId)];
  if (!existing) return;
  const followUps = (existing.followUps ?? []).map((item) => item.studentId === studentId ? { ...item, state, owner, updatedAt: new Date().toISOString() } : item);
  records[key(classId)] = { ...existing, followUps };
  writeAll(records);
}

export function useAttendance(classId: string, level: string) {
  const [entry, setEntry] = useState(() => getAttendance(classId, level));

  useEffect(() => {
    setEntry(getAttendance(classId, level));
    const refresh = () => setEntry(getAttendance(classId, level));
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [classId, level]);

  return entry;
}

export function reviewAttendance(classId: string, status: "Approved" | "Returned", reviewedBy: string, returnReason?: string) {
  const records = readAll();
  const existing = records[key(classId)];
  if (!existing) return;
  records[key(classId)] = { ...existing, status, reviewedAt: new Date().toISOString(), reviewedBy, returnReason };
  writeAll(records);
}

export function useAttendanceRecords() {
  const [records, setRecords] = useState<Record<string, AttendanceEntry>>(readAll);
  useEffect(() => {
    const refresh = () => setRecords(readAll());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return records;
}