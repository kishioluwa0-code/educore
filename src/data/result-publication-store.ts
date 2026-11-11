import { CLASSES, SUBJECTS } from "@/data/academics";
import { getPublishedRowsForStudent, type GradeBookRecord } from "@/data/gradebook-store";

export type ResultPublicationNotice = { id: string; session: string; term: string; classId: string; subjectCode: string; publishedAt: string; recipients: number };
const NOTICE_KEY = "educore.result-publication-notices";

function readNotices() {
  if (typeof window === "undefined") return [] as ResultPublicationNotice[];
  try { return JSON.parse(window.localStorage.getItem(NOTICE_KEY) ?? "[]") as ResultPublicationNotice[]; } catch { return []; }
}

export function recordResultPublication(session: string, term: string, classId: string, subjectCode: string, record: GradeBookRecord) {
  if (typeof window === "undefined") return;
  const existing = readNotices();
  const notice = { id: `RPN-${Date.now()}`, session, term, classId, subjectCode, publishedAt: new Date().toISOString(), recipients: record.rows.length };
  window.localStorage.setItem(NOTICE_KEY, JSON.stringify([...existing, notice]));
  return notice;
}

export function verifyPublishedResult(studentId: string, session: string, term: string) {
  const rows = getPublishedRowsForStudent(studentId, session, term);
  return rows.length ? { studentId, session, term, subjects: rows.map((row) => ({ subject: row.subjectName, classId: CLASSES.find((item) => item.level === row.student.level && item.arm === row.student.arm)?.id, subjectCode: SUBJECTS.find((item) => item.name === row.subjectName)?.code, score: row.ca1 + row.ca2 + row.assignment + row.exam })) } : null;
}
