import { useEffect, useState } from "react";
import { GATE_SCANS } from "@/data/academics";
import { STAFF, fullName } from "@/data/school";
import { getStudents } from "@/data/student-store";

export type AccessPersonType = "Student" | "Staff";
export type AccessDirection = "In" | "Out";
export type AccessEvent = {
  id: string;
  personType: AccessPersonType;
  personId: string;
  name: string;
  direction: AccessDirection;
  gate: string;
  method: "QR scan" | "Fingerprint" | "Manual";
  occurredAt: string;
  ok: boolean;
};
export type StaffAttendanceSummary = {
  staffId: string;
  name: string;
  presentDays: number;
  currentStatus: "On campus" | "Off campus";
  firstClockIn?: string;
  lastClockOut?: string;
};

const STORAGE_KEY = "educore.access-events";
const CHANGE_EVENT = "educore:access-events-changed";

function seededEvents(): AccessEvent[] {
  return GATE_SCANS.map((scan) => ({
    id: scan.id,
    personType: scan.ref.startsWith("STF-") ? "Staff" : "Student",
    personId: scan.ref,
    name: scan.name,
    direction: scan.direction,
    gate: scan.gate,
    method: "QR scan",
    occurredAt: `2026-08-22T${scan.time}:00+01:00`,
    ok: scan.ok,
  }));
}

function readEvents() {
  if (typeof window === "undefined") return seededEvents();
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as AccessEvent[]) : seededEvents();
  } catch {
    return seededEvents();
  }
}

function writeEvents(events: AccessEvent[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getAccessEvents() {
  return readEvents().sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function resolvePerson(personId: string, type: AccessPersonType) {
  const people = type === "Student"
    ? getStudents().map((student) => ({ id: student.id, name: fullName(student) }))
    : STAFF.map((staff) => ({ id: staff.id, name: staff.name }));
  return people.find((person) => person.id === personId);
}

export function isOnCampus(personId: string) {
  const latest = getAccessEvents().find((event) => event.personId === personId && event.ok);
  return latest?.direction === "In";
}

export function createAccessEvent(input: {
  personId: string;
  personType: AccessPersonType;
  gate: string;
  method: AccessEvent["method"];
}) {
  const person = resolvePerson(input.personId, input.personType);
  if (!person) return { ok: false as const, error: "No matching student or staff record found." };
  const onCampus = isOnCampus(person.id);
  const direction: AccessDirection = onCampus ? "Out" : "In";
  const event: AccessEvent = {
    id: `ACC-${Date.now()}`,
    personType: input.personType,
    personId: person.id,
    name: person.name,
    direction,
    gate: input.gate,
    method: input.method,
    occurredAt: new Date().toISOString(),
    ok: true,
  };
  writeEvents([...readEvents(), event]);
  return { ok: true as const, event };
}

export function useAccessEvents() {
  const [events, setEvents] = useState<AccessEvent[]>(getAccessEvents);
  useEffect(() => {
    const refresh = () => setEvents(getAccessEvents());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return events;
}

export function getStaffAttendanceSummary(): StaffAttendanceSummary[] {
  const events = getAccessEvents().filter((event) => event.personType === "Staff" && event.ok);
  return STAFF.map((staff) => {
    const personEvents = events.filter((event) => event.personId === staff.id);
    const clockIns = personEvents.filter((event) => event.direction === "In");
    const clockOuts = personEvents.filter((event) => event.direction === "Out");
    return {
      staffId: staff.id,
      name: staff.name,
      presentDays: new Set(clockIns.map((event) => event.occurredAt.slice(0, 10))).size,
      currentStatus: isOnCampus(staff.id) ? "On campus" : "Off campus",
      firstClockIn: clockIns.at(-1)?.occurredAt,
      lastClockOut: clockOuts[0]?.occurredAt,
    };
  });
}