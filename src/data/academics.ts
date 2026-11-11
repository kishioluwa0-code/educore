import { STUDENTS, fullName, type Student } from "./school";

export type Subject = {
  code: string;
  name: string;
  department: string;
  levels: string;
  teacher: string;
  periods: number;
  coverage: number;
  core: boolean;
};

export const SUBJECTS: Subject[] = [
  { code: "MTH", name: "Mathematics", department: "Sciences", levels: "JSS 1 – SS 3", teacher: "Mr. Sunday Okafor", periods: 6, coverage: 72, core: true },
  { code: "ENG", name: "English Language", department: "Languages", levels: "JSS 1 – SS 3", teacher: "Mrs. Bisi Alao", periods: 6, coverage: 68, core: true },
  { code: "BSC", name: "Basic Science", department: "Sciences", levels: "JSS 1 – JSS 3", teacher: "Mr. Chuka Nnaji", periods: 4, coverage: 81, core: true },
  { code: "PHY", name: "Physics", department: "Sciences", levels: "SS 1 – SS 3", teacher: "Mrs. Halimat Bakare", periods: 5, coverage: 64, core: false },
  { code: "CHM", name: "Chemistry", department: "Sciences", levels: "SS 1 – SS 3", teacher: "Mr. Femi Odutola", periods: 5, coverage: 59, core: false },
  { code: "BIO", name: "Biology", department: "Sciences", levels: "SS 1 – SS 3", teacher: "Mrs. Ada Nwosu", periods: 5, coverage: 77, core: false },
  { code: "GVT", name: "Government", department: "Humanities", levels: "SS 1 – SS 3", teacher: "Mr. Kunle Ariyo", periods: 4, coverage: 70, core: false },
  { code: "ECN", name: "Economics", department: "Humanities", levels: "SS 1 – SS 3", teacher: "Mrs. Tope Lawal", periods: 4, coverage: 66, core: false },
  { code: "CVE", name: "Civic Education", department: "Humanities", levels: "JSS 1 – SS 3", teacher: "Mr. Emeka Duru", periods: 2, coverage: 88, core: true },
  { code: "AGR", name: "Agricultural Science", department: "Vocational", levels: "JSS 1 – SS 3", teacher: "Mr. Musa Idris", periods: 3, coverage: 74, core: false },
  { code: "CRS", name: "Christian Religious Studies", department: "Humanities", levels: "JSS 1 – SS 3", teacher: "Mrs. Ruth Eze", periods: 2, coverage: 83, core: false },
  { code: "IRS", name: "Islamic Religious Studies", department: "Humanities", levels: "JSS 1 – SS 3", teacher: "Mal. Abdul Yakubu", periods: 2, coverage: 79, core: false },
  { code: "ICT", name: "Computer Studies / ICT", department: "Vocational", levels: "JSS 1 – SS 3", teacher: "Mr. Tobi Ajala", periods: 3, coverage: 61, core: true },
  { code: "YOR", name: "Yoruba Language", department: "Languages", levels: "JSS 1 – SS 3", teacher: "Mrs. Bukola Ige", periods: 2, coverage: 90, core: false },
];

export type ClassRow = {
  id: string;
  level: string;
  arm: string;
  section: Student["section"];
  formTeacher: string;
  capacity: number;
  enrolled: number;
  room: string;
};

export const CLASSES: ClassRow[] = [
  { id: "C-JS1A", level: "JSS 1", arm: "A", section: "Junior Secondary", formTeacher: "Mrs. Ruth Eze", capacity: 40, enrolled: 38, room: "Block A – 101" },
  { id: "C-JS1B", level: "JSS 1", arm: "B", section: "Junior Secondary", formTeacher: "Mr. Emeka Duru", capacity: 40, enrolled: 36, room: "Block A – 102" },
  { id: "C-JS2A", level: "JSS 2", arm: "A", section: "Junior Secondary", formTeacher: "Mr. Sunday Okafor", capacity: 40, enrolled: 40, room: "Block A – 201" },
  { id: "C-JS2C", level: "JSS 2", arm: "C", section: "Junior Secondary", formTeacher: "Mrs. Bisi Alao", capacity: 40, enrolled: 33, room: "Block A – 203" },
  { id: "C-JS3A", level: "JSS 3", arm: "A", section: "Junior Secondary", formTeacher: "Mr. Chuka Nnaji", capacity: 40, enrolled: 39, room: "Block B – 101" },
  { id: "C-SS1A", level: "SS 1", arm: "A", section: "Senior Secondary", formTeacher: "Mrs. Halimat Bakare", capacity: 35, enrolled: 34, room: "Block C – 101" },
  { id: "C-SS2A", level: "SS 2", arm: "A", section: "Senior Secondary", formTeacher: "Mr. Femi Odutola", capacity: 35, enrolled: 31, room: "Block C – 201" },
  { id: "C-SS2C", level: "SS 2", arm: "C", section: "Senior Secondary", formTeacher: "Mrs. Ada Nwosu", capacity: 35, enrolled: 29, room: "Block C – 203" },
  { id: "C-SS3A", level: "SS 3", arm: "A", section: "Senior Secondary", formTeacher: "Mr. Kunle Ariyo", capacity: 35, enrolled: 35, room: "Block D – 101" },
  { id: "C-PR5A", level: "Primary 5", arm: "A", section: "Primary", formTeacher: "Mrs. Tope Lawal", capacity: 30, enrolled: 28, room: "Primary Block – 5A" },
];

export const PERIODS = ["08:00", "08:45", "09:30", "10:15", "11:15", "12:00", "12:45"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const TT_POOL = ["MTH", "ENG", "BSC", "CVE", "ICT", "AGR", "CRS", "YOR", "PHY", "CHM", "BIO", "GVT", "ECN"];

export function timetableFor(classId: string) {
  const seed = classId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return WEEKDAYS.map((day, d) => ({
    day,
    slots: PERIODS.map((time, p) => {
      if (p === 4) return { time, code: "BREAK", subject: "Break", teacher: "" };
      const code = TT_POOL[(seed + d * 3 + p * 5) % TT_POOL.length]!;
      const subject = SUBJECTS.find((s) => s.code === code)!;
      return { time, code, subject: subject.name, teacher: subject.teacher };
    }),
  }));
}

export type SchemeWeek = {
  week: number;
  topic: string;
  status: "Covered" | "In progress" | "Not started";
};

export const SCHEME_OF_WORK: SchemeWeek[] = [
  { week: 1, topic: "Number bases and conversions", status: "Covered" },
  { week: 2, topic: "Modular arithmetic", status: "Covered" },
  { week: 3, topic: "Indices and logarithms", status: "Covered" },
  { week: 4, topic: "Simple and compound interest", status: "Covered" },
  { week: 5, topic: "Approximation and significant figures", status: "Covered" },
  { week: 6, topic: "Simultaneous linear equations", status: "In progress" },
  { week: 7, topic: "Mid-term assessment and revision", status: "Not started" },
  { week: 8, topic: "Quadratic equations", status: "Not started" },
  { week: 9, topic: "Plane geometry — angles and polygons", status: "Not started" },
  { week: 10, topic: "Statistics — mean, median and mode", status: "Not started" },
  { week: 11, topic: "Probability", status: "Not started" },
  { week: 12, topic: "Terminal examination", status: "Not started" },
];

/* ---------------- Attendance ---------------- */

export type MarkState = "Present" | "Absent" | "Late" | "Excused";

export type RegisterRow = {
  student: Student;
  state: MarkState;
  method: "QR scan" | "Fingerprint" | "Manual" | "Not marked";
  time?: string | undefined;
};

export function registerFor(level: string): RegisterRow[] {
  return STUDENTS.filter((s) => s.level === level).map((s, i) => ({
    student: s,
    state: (["Present", "Present", "Present", "Late", "Absent", "Present", "Excused"] as MarkState[])[i % 7]!,
    method: (["QR scan", "QR scan", "Fingerprint", "Manual", "Not marked", "QR scan", "Manual"] as const)[i % 7]!,
    time: i % 7 === 4 ? undefined : `0${7 + (i % 2)}:${String(10 + i * 3).slice(0, 2)}`,
  }));
}

export const GATE_SCANS = [
  { id: "SCN-8841", name: "Adaeze Okonkwo", ref: "GMC/SS/1420", gate: "Main Gate · Scanner 01", time: "07:12", direction: "In" as const, ok: true },
  { id: "SCN-8842", name: "Chidi Balogun", ref: "GMC/SS/1421", gate: "Main Gate · Scanner 01", time: "07:14", direction: "In" as const, ok: true },
  { id: "SCN-8843", name: "Unknown card", ref: "IDC-2025-0912", gate: "Side Gate · Scanner 02", time: "07:19", direction: "In" as const, ok: false },
  { id: "SCN-8844", name: "Fatima Yusuf", ref: "GMC/JS/1422", gate: "Main Gate · Scanner 01", time: "07:23", direction: "In" as const, ok: true },
  { id: "SCN-8845", name: "Emeka Nwachukwu", ref: "GMC/JS/1423", gate: "Side Gate · Scanner 02", time: "07:41", direction: "In" as const, ok: true },
  { id: "SCN-8846", name: "Mr. Ali Mohammed", ref: "STF-0233", gate: "Staff Gate · Scanner 03", time: "06:52", direction: "In" as const, ok: true },
  { id: "SCN-8847", name: "Zainab Bello", ref: "GMC/PR/1424", gate: "Main Gate · Scanner 01", time: "13:40", direction: "Out" as const, ok: true },
];

export const SYNC_QUEUE = [
  { id: "SYN-301", device: "Gate Scanner 02", records: 27, captured: "2026-08-22T06:40:00Z", status: "Synced" as const },
  { id: "SYN-302", device: "JSS 2A Tablet", records: 40, captured: "2026-08-22T07:05:00Z", status: "Pending" as const },
  { id: "SYN-303", device: "SS 3A Tablet", records: 35, captured: "2026-08-22T07:12:00Z", status: "Pending" as const },
  { id: "SYN-304", device: "Fingerprint Terminal 01", records: 118, captured: "2026-08-22T07:20:00Z", status: "Conflict" as const },
  { id: "SYN-305", device: "Primary Block Tablet", records: 28, captured: "2026-08-21T14:02:00Z", status: "Synced" as const },
];

export const VISITORS = [
  { id: "VIS-771", name: "Mrs. Ronke Adebayo", purpose: "Guardian pickup — Aisha Lawal", host: "Front Desk", inTime: "12:40", outTime: "13:05", badge: "V-018" },
  { id: "VIS-772", name: "Engr. Paul Okoro", purpose: "Facility inspection", host: "Operations", inTime: "09:15", outTime: "—", badge: "V-019" },
  { id: "VIS-773", name: "Ms. Grace Nwafor", purpose: "WAEC liaison visit", host: "Examinations", inTime: "10:02", outTime: "11:44", badge: "V-020" },
];

/* ---------------- Assessment ---------------- */

export type GradeRow = {
  student: Student;
  ca1: number;
  ca2: number;
  assignment: number;
  exam: number;
};

export function gradeRowsFor(level: string): GradeRow[] {
  return STUDENTS.filter((s) => s.level === level).map((s, i) => ({
    student: s,
    ca1: 10 + ((i * 3) % 11),
    ca2: 9 + ((i * 5) % 12),
    assignment: 6 + ((i * 2) % 5),
    exam: 100 - (10 + ((i * 3) % 11)) - (9 + ((i * 5) % 12)) - (6 + ((i * 2) % 5)),
  }));
}

export const total = (r: GradeRow) => r.ca1 + r.ca2 + r.assignment + r.exam;

export function waecGrade(score: number) {
  if (score >= 75) return { grade: "A1", remark: "Excellent", tone: "teal" as const };
  if (score >= 70) return { grade: "B2", remark: "Very good", tone: "success" as const };
  if (score >= 65) return { grade: "B3", remark: "Good", tone: "success" as const };
  if (score >= 60) return { grade: "C4", remark: "Credit", tone: "info" as const };
  if (score >= 55) return { grade: "C5", remark: "Credit", tone: "info" as const };
  if (score >= 50) return { grade: "C6", remark: "Credit", tone: "info" as const };
  if (score >= 45) return { grade: "D7", remark: "Pass", tone: "warning" as const };
  if (score >= 40) return { grade: "E8", remark: "Pass", tone: "warning" as const };
  return { grade: "F9", remark: "Fail", tone: "danger" as const };
}

export const GRADE_BOOKS = [
  { id: "GB-1", level: "JSS 2", arm: "A", subject: "Mathematics", teacher: "Mr. Sunday Okafor", status: "Submitted" as const, updated: "2026-08-21" },
  { id: "GB-2", level: "JSS 2", arm: "A", subject: "English Language", teacher: "Mrs. Bisi Alao", status: "Draft" as const, updated: "2026-08-20" },
  { id: "GB-3", level: "SS 3", arm: "A", subject: "Physics", teacher: "Mrs. Halimat Bakare", status: "Published" as const, updated: "2026-08-18" },
  { id: "GB-4", level: "SS 2", arm: "A", subject: "Chemistry", teacher: "Mr. Femi Odutola", status: "Submitted" as const, updated: "2026-08-21" },
  { id: "GB-5", level: "JSS 3", arm: "A", subject: "Basic Science", teacher: "Mr. Chuka Nnaji", status: "Draft" as const, updated: "2026-08-22" },
  { id: "GB-6", level: "SS 1", arm: "A", subject: "Biology", teacher: "Mrs. Ada Nwosu", status: "Published" as const, updated: "2026-08-15" },
];

export const CBT_SESSIONS = [
  { id: "CBT-11", title: "SS 3 Mock — Mathematics", questions: 50, duration: "1h 30m", candidates: 35, submitted: 35, status: "Completed" as const, date: "2026-08-19" },
  { id: "CBT-12", title: "JSS 3 BECE Practice — Basic Science", questions: 60, duration: "2h 00m", candidates: 39, submitted: 12, status: "In progress" as const, date: "2026-08-22" },
  { id: "CBT-13", title: "SS 2 Mid-term — Economics", questions: 40, duration: "1h 00m", candidates: 31, submitted: 0, status: "Scheduled" as const, date: "2026-08-26" },
];

/* ---------------- Examinations ---------------- */

export type ExamBody = "BECE" | "WAEC / WASSCE" | "NECO / SSCE" | "NABTEB";

export const EXAM_REGISTRATIONS: {
  body: ExamBody;
  level: string;
  candidates: number;
  registered: number;
  feePerCandidate: number;
  deadline: string;
  status: "Open" | "Closing soon" | "Closed";
}[] = [
  { body: "BECE", level: "JSS 3", candidates: 39, registered: 31, feePerCandidate: 12500, deadline: "2026-09-04", status: "Closing soon" },
  { body: "WAEC / WASSCE", level: "SS 3", candidates: 35, registered: 35, feePerCandidate: 27500, deadline: "2026-10-12", status: "Open" },
  { body: "NECO / SSCE", level: "SS 3", candidates: 35, registered: 22, feePerCandidate: 24000, deadline: "2026-10-30", status: "Open" },
  { body: "NABTEB", level: "SS 3", candidates: 8, registered: 8, feePerCandidate: 21000, deadline: "2026-07-28", status: "Closed" },
];

export const EXAM_TIMETABLE = [
  { date: "2026-09-15", time: "09:00", paper: "Mathematics Paper 2", body: "BECE" as ExamBody, hall: "Main Hall", invigilator: "Mr. John Adeyinka" },
  { date: "2026-09-15", time: "12:30", paper: "English Language Paper 1", body: "BECE" as ExamBody, hall: "Main Hall", invigilator: "Mrs. Bisi Alao" },
  { date: "2026-09-17", time: "09:00", paper: "Basic Science", body: "BECE" as ExamBody, hall: "Block B Lab", invigilator: "Mr. Chuka Nnaji" },
  { date: "2026-11-03", time: "09:00", paper: "Physics Practical", body: "WAEC / WASSCE" as ExamBody, hall: "Physics Lab", invigilator: "Mrs. Halimat Bakare" },
  { date: "2026-11-05", time: "09:00", paper: "Chemistry Paper 3", body: "WAEC / WASSCE" as ExamBody, hall: "Chemistry Lab", invigilator: "Mr. Femi Odutola" },
];

export const candidateName = fullName;
