import { useEffect, useState } from "react";
import { CLASSES, GRADE_BOOKS, SUBJECTS, gradeRowsFor, total, type GradeRow } from "@/data/academics";
import { recordAudit } from "@/data/audit-store";

export type GradeBookStatus = "Draft" | "Submitted" | "Approved" | "Published" | "Correction requested";
export type GradeBookRecord = {
  rows: GradeRow[];
  status: GradeBookStatus;
  updatedAt: string;
  moderation?: { reviewedBy: string; reviewedAt: string; decision: "Approved" | "Correction requested"; note?: string };
};
export type GradeBookAuditEvent = { id: string; action: string; actor: string; scope: string; occurredAt: string };
export type ModerationQueueItem = {
  classId: string;
  subjectCode: string;
  level: string;
  arm: string;
  subjectName: string;
  teacher: string;
  record: GradeBookRecord;
  exceptionCount: number;
};

const STORAGE_KEY = "educore.grade-books";
const CHANGE_EVENT = "educore:grade-books-changed";
const CORRECTION_KEY = "educore.grade-book-corrections";
const AUDIT_KEY = "educore.grade-book-audit";

function readAll(): Record<string, GradeBookRecord> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, GradeBookRecord>;
  } catch {
    return {};
  }
}

function key(session: string, term: string, classId: string, subjectCode: string) {
  return `${session}:${term}:${classId}:${subjectCode}`;
}

const TERM_ORDER = ["First Term", "Second Term", "Third Term"];

function inheritedRows(session: string, term: string, classId: string, subjectCode: string, level: string) {
  const termIndex = TERM_ORDER.indexOf(term);
  if (termIndex <= 0) return gradeRowsFor(level);
  for (let index = termIndex - 1; index >= 0; index -= 1) {
    const previous = readAll()[key(session, TERM_ORDER[index]!, classId, subjectCode)];
    if (previous) return previous.rows;
  }
  return gradeRowsFor(level);
}

function writeAll(records: Record<string, GradeBookRecord>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function normalizeRows(rows: GradeRow[]) {
  return rows.map((row) => {
    const ca1 = Math.min(20, Math.max(0, row.ca1));
    const ca2 = Math.min(20, Math.max(0, row.ca2));
    const assignment = Math.min(10, Math.max(0, row.assignment));
    const exam = Math.min(50, Math.max(0, row.exam));
    return { ...row, ca1, ca2, assignment, exam };
  });
}

export function recordCbtExamScore(session: string, term: string, classId: string, subjectCode: string, level: string, studentId: string, score: number, maximum: number) {
  const record = getGradeBook(session, term, classId, subjectCode, level, "Draft");
  const exam = Math.min(50, Math.max(0, Math.round((score / Math.max(1, maximum)) * 50)));
  const rows = record.rows.map((row) => row.student.id === studentId ? { ...row, exam } : row);
  if (!rows.some((row) => row.student.id === studentId)) return false;
  saveGradeBook(session, term, classId, subjectCode, { ...record, rows, status: record.status === "Published" ? "Published" : "Draft" });
  return true;
}

export function recordGradeBookAudit(event: Omit<GradeBookAuditEvent, "id" | "occurredAt">) {
  if (typeof window === "undefined") return;
  let existing: GradeBookAuditEvent[] = [];
  try { existing = JSON.parse(window.localStorage.getItem(AUDIT_KEY) ?? "[]") as GradeBookAuditEvent[]; } catch { }
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify([...existing, { ...event, id: `GBA-${Date.now()}`, occurredAt: new Date().toISOString() }]));
  recordAudit({ action: event.action, actor: event.actor, scope: event.scope, category: "Assessment" });
}

export function getGradeBook(session: string, term: string, classId: string, subjectCode: string, level: string, initialStatus: GradeBookStatus): GradeBookRecord {
  const stored = readAll()[key(session, term, classId, subjectCode)];
  return stored ? { ...stored, rows: normalizeRows(stored.rows) } : { rows: normalizeRows(inheritedRows(session, term, classId, subjectCode, level)), status: initialStatus, updatedAt: new Date().toISOString() };
}

export function saveGradeBook(session: string, term: string, classId: string, subjectCode: string, record: GradeBookRecord) {
  const records = readAll();
  records[key(session, term, classId, subjectCode)] = { ...record, updatedAt: new Date().toISOString() };
  writeAll(records);
}

export function getGradeBookCounts(): Record<GradeBookStatus, number> {
  const stored = Object.values(readAll());
  const statuses = stored.length ? stored.map((record) => record.status) : GRADE_BOOKS.map((book) => book.status);
  return {
    Draft: statuses.filter((status) => status === "Draft").length,
    Submitted: statuses.filter((status) => status === "Submitted").length,
    Approved: statuses.filter((status) => status === "Approved").length,
    Published: statuses.filter((status) => status === "Published").length,
    "Correction requested": statuses.filter((status) => status === "Correction requested").length,
  };
}

export function useGradeBook(session: string, term: string, classId: string, subjectCode: string, level: string, initialStatus: GradeBookStatus) {
  const [record, setRecord] = useState<GradeBookRecord>(() => ({ rows: gradeRowsFor(level), status: initialStatus, updatedAt: new Date(0).toISOString() }));
  useEffect(() => {
    setRecord(getGradeBook(session, term, classId, subjectCode, level, initialStatus));
    const refresh = () => setRecord(getGradeBook(session, term, classId, subjectCode, level, initialStatus));
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [session, term, classId, subjectCode, level, initialStatus]);
  return record;
}

export function useGradeBookCounts() {
  const [counts, setCounts] = useState<Record<GradeBookStatus, number>>({
    Draft: GRADE_BOOKS.filter((book) => book.status === "Draft").length,
    Submitted: GRADE_BOOKS.filter((book) => book.status === "Submitted").length,
    Approved: 0,
    Published: GRADE_BOOKS.filter((book) => book.status === "Published").length,
    "Correction requested": 0,
  });
  useEffect(() => {
    const refresh = () => setCounts(getGradeBookCounts());
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return counts;
}

export function getPublishedRowsForStudent(studentId: string, session?: string, term?: string) {
  return Object.entries(readAll())
    .filter(([recordKey, record]) => {
      const [recordSession, recordTerm] = recordKey.split(":");
      return (record.status === "Published" || record.status === "Correction requested") && (!session || recordSession === session) && (!term || recordTerm === term);
    })
    .flatMap(([recordKey, record]) => {
      const subjectCode = recordKey.split(":").at(-1);
      const subjectName = SUBJECTS.find((subject) => subject.code === subjectCode)?.name ?? subjectCode ?? "Subject";
      return record.rows.filter((row) => row.student.id === studentId).map((row) => ({ ...row, subjectName }));
    });
}

export function requestCorrectionForStudent(studentId: string) {
  const published = getPublishedRowsForStudent(studentId);
  if (!published.length || typeof window === "undefined") return false;
  const requests = JSON.parse(window.localStorage.getItem(CORRECTION_KEY) ?? "[]") as Array<{ studentId: string; requestedAt: string }>;
  if (!requests.some((request) => request.studentId === studentId)) {
    requests.push({ studentId, requestedAt: new Date().toISOString() });
    window.localStorage.setItem(CORRECTION_KEY, JSON.stringify(requests));
  }
  return true;
}

export function getPublishedGradeBooks(session: string, term: string) {
  return Object.entries(readAll())
    .filter(([recordKey, record]) => record.status === "Published" && recordKey.startsWith(`${session}:${term}:`))
    .map(([recordKey, record]) => {
      const [, , classId, subjectCode] = recordKey.split(":");
      return { classId, subjectCode, record };
    });
}

export function reviewGradeBook(session: string, term: string, classId: string, subjectCode: string, record: GradeBookRecord, decision: "Approved" | "Correction requested", reviewedBy: string, note?: string) {
  saveGradeBook(session, term, classId, subjectCode, {
    ...record,
    status: decision,
    moderation: { decision, reviewedBy, reviewedAt: new Date().toISOString(), note },
  });
}

export function getModerationQueue(session: string, term: string): ModerationQueueItem[] {
  const stored = readAll();
  return GRADE_BOOKS
    .filter((book) => book.status === "Submitted")
    .map((book) => {
      const cls = CLASSES.find((item) => item.level === book.level && item.arm === book.arm);
      const subject = SUBJECTS.find((item) => item.name === book.subject);
      if (!cls || !subject) return null;
      const recordKey = key(session, term, cls.id, subject.code);
      const record = stored[recordKey]?.status === "Submitted"
        ? { ...stored[recordKey], rows: normalizeRows(stored[recordKey].rows) }
        : { rows: gradeRowsFor(cls.level), status: "Submitted" as const, updatedAt: new Date(`${book.updated}T00:00:00Z`).toISOString() };
      return { classId: cls.id, subjectCode: subject.code, level: cls.level, arm: cls.arm, subjectName: subject.name, teacher: book.teacher, record, exceptionCount: record.rows.filter((row) => total(row) < 40).length };
    })
    .filter((item): item is ModerationQueueItem => item !== null)
    .concat(Object.entries(stored)
      .filter(([recordKey, record]) => record.status === "Submitted" && recordKey.startsWith(`${session}:${term}:`))
      .map(([recordKey, record]) => {
        const [, , classId, subjectCode] = recordKey.split(":");
        if (GRADE_BOOKS.some((book) => book.status === "Submitted" && CLASSES.find((item) => item.id === classId)?.level === book.level && CLASSES.find((item) => item.id === classId)?.arm === book.arm && SUBJECTS.find((item) => item.code === subjectCode)?.name === book.subject)) return null;
        const cls = CLASSES.find((item) => item.id === classId);
        const subject = SUBJECTS.find((item) => item.code === subjectCode);
        if (!cls || !subject) return null;
        const normalizedRecord = { ...record, rows: normalizeRows(record.rows) };
        return { classId, subjectCode, level: cls.level, arm: cls.arm, subjectName: subject.name, teacher: subject.teacher, record: normalizedRecord, exceptionCount: normalizedRecord.rows.filter((row) => total(row) < 40).length };
      })
      .filter((item): item is ModerationQueueItem => item !== null));
}

export function useModerationQueue(session: string, term: string) {
  const [queue, setQueue] = useState<ModerationQueueItem[]>([]);
  useEffect(() => {
    const refresh = () => setQueue(getModerationQueue(session, term));
    refresh();
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [session, term]);
  return queue;
}