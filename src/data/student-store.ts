import { type Guardian, type Student, type StudentStatus } from "@/data/school";
import { useEffect, useState } from "react";
import { recordAudit } from "@/data/audit-store";
import { listServerStudents, type ServerStudent } from "@/lib/student-api";

const STORAGE_KEY = "educore.students";
const CHANGE_EVENT = "educore:students-changed";
const AUDIT_KEY = "educore.student-audit-events";

export type StudentAuditEvent = {
  id: string;
  studentId: string;
  action: string;
  actor: string;
  occurredAt: string;
};
export type StudentLifecycleEvent = StudentAuditEvent & { reason?: string; effectiveDate?: string; fromLevel?: string; toLevel?: string };

function readStudents() {
  if (typeof window === "undefined") return [] as Student[];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return [] as Student[];
  try {
    const parsed = JSON.parse(stored) as Student[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStudents(students: Student[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function readAuditEvents() {
  if (typeof window === "undefined") return [] as StudentAuditEvent[];
  try {
    const stored = window.localStorage.getItem(AUDIT_KEY);
    const parsed = stored ? (JSON.parse(stored) as StudentAuditEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAuditEvent(event: StudentAuditEvent) {
  window.localStorage.setItem(AUDIT_KEY, JSON.stringify([...readAuditEvents(), event]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  recordAudit({ action: event.action, actor: event.actor, scope: event.studentId, category: "Students" });
}

export function getStudentAuditEvents(studentId: string) {
  return readAuditEvents()
    .filter((event) => event.studentId === studentId)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export function getStudents() {
  return readStudents();
}

export function createStudent(input: Pick<Student, "firstName" | "lastName" | "gender" | "section" | "level" | "arm"> & Partial<Student>) {
  const students = readStudents();
  const sequence = students.length + 1461;
  const id = `GMC/${input.section === "Senior Secondary" ? "SS" : input.section === "Junior Secondary" ? "JS" : input.section === "Primary" ? "PR" : "NS"}/${sequence}`;
  const student: Student = {
    id,
    admissionNo: `ADM-2026-${sequence}`,
    firstName: "",
    lastName: "",
    gender: "Female",
    dob: "",
    section: "Primary",
    level: "",
    arm: "",
    status: "Pending approval",
    attendance: "Excused",
    attendanceRate: 0,
    academicStatus: "On track",
    average: 0,
    position: 0,
    feeBalance: 0,
    feeExpected: 0,
    stateOfOrigin: "",
    lga: "",
    religion: "",
    bloodGroup: "",
    genotype: "",
    address: "",
    admittedOn: "",
    house: "",
    guardians: [],
    idCard: { status: "Not generated" },
    documentsComplete: false,
    ...input,
    id,
    admissionNo: `ADM-2026-${sequence}`,
    status: input.status ?? ("Active" as StudentStatus),
    admittedOn: new Date().toISOString().slice(0, 10),
    guardians: input.guardians ?? [],
    idCard: { status: "Not generated" },
  };
  writeStudents([...students, student]);
  if (student.status === "Pending approval") {
    writeAuditEvent({ id: `AUD-${Date.now()}`, studentId: student.id, action: "Admission submitted", actor: "Admissions Office", occurredAt: new Date().toISOString() });
  }
  return student;
}

export function approveStudent(studentId: string, actor: string) {
  const student = updateStudent(studentId, { status: "Active" });
  if (student) {
    writeAuditEvent({ id: `AUD-${Date.now()}`, studentId, action: "Admission approved", actor, occurredAt: new Date().toISOString() });
  }
  return student;
}

export function updateStudent(id: string, changes: Partial<Student>) {
  const students = readStudents();
  const updated = students.map((student) => (student.id === id ? { ...student, ...changes } : student));
  writeStudents(updated);
  return updated.find((student) => student.id === id);
}

export function useStudents() {
  const [students, setStudents] = useState<Student[]>(readStudents);

  useEffect(() => {
    const refresh = () => setStudents(readStudents());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return students;
}

function serverStatus(status: ServerStudent["status"]): StudentStatus {
  return {
    pending: "Pending approval",
    approved: "Active",
    rejected: "Withdrawn",
    transferred: "Active",
    withdrawn: "Withdrawn",
  }[status];
}

function mergeServerStudent(serverStudent: ServerStudent, existing?: Student): Student {
  const template = existing ?? createEmptyStudent(serverStudent.id);
  return {
    ...template,
    ...existing,
    id: serverStudent.id,
    admissionNo: serverStudent.admissionNo,
    firstName: serverStudent.firstName,
    lastName: serverStudent.lastName,
    otherName: serverStudent.middleName ?? undefined,
    gender: serverStudent.gender === "Female" ? "Female" : "Male",
    dob: serverStudent.dateOfBirth?.slice(0, 10) ?? template.dob,
    level: serverStudent.classId ?? template.level,
    arm: serverStudent.armId ?? template.arm,
    status: serverStatus(serverStudent.status),
    admittedOn: serverStudent.admittedAt?.slice(0, 10) ?? template.admittedOn,
    guardians: existing?.guardians ?? [],
  };
}

function createEmptyStudent(id: string): Student {
  return { id, admissionNo: "", firstName: "", lastName: "", gender: "Female", dob: "", section: "Primary", level: "", arm: "", status: "Pending approval", attendance: "Excused", attendanceRate: 0, academicStatus: "On track", average: 0, position: 0, feeBalance: 0, feeExpected: 0, stateOfOrigin: "", lga: "", religion: "", bloodGroup: "", genotype: "", address: "", admittedOn: "", house: "", guardians: [], idCard: { status: "Not generated" }, documentsComplete: false };
}

export function useStudentRegistry(authenticated: boolean) {
  const [students, setStudents] = useState<Student[]>(readStudents);
  const [loading, setLoading] = useState(authenticated);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const refreshLocal = () => {
      if (active) setStudents(readStudents());
    };
    window.addEventListener(CHANGE_EVENT, refreshLocal);
    window.addEventListener("storage", refreshLocal);

    if (authenticated) {
      setLoading(true);
      listServerStudents()
        .then((serverStudents) => {
          if (!active) return;
          const localStudents = readStudents();
          setStudents(
            serverStudents.map((serverStudent) =>
              mergeServerStudent(
                serverStudent,
                localStudents.find((student) => student.id === serverStudent.id),
              ),
            ),
          );
          setError(null);
        })
        .catch((reason: unknown) => {
          if (active) setError(reason instanceof Error ? reason.message : "Unable to sync students");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
      window.removeEventListener(CHANGE_EVENT, refreshLocal);
      window.removeEventListener("storage", refreshLocal);
    };
  }, [authenticated]);

  return { students, loading, error };
}

export function addGuardian(studentId: string, input: Pick<Guardian, "name" | "relationship" | "phone"> & Partial<Guardian>) {
  const students = readStudents();
  const guardian: Guardian = {
    id: `GRD-${Date.now()}`,
    name: input.name,
    relationship: input.relationship,
    phone: input.phone,
    email: input.email ?? "",
    occupation: input.occupation ?? "",
    verified: "Pending",
    primary: input.primary ?? false,
    financiallyResponsible: input.financiallyResponsible ?? false,
    pickupAuthorized: input.pickupAuthorized ?? false,
    address: input.address ?? "",
  };
  const updated = students.map((student) =>
    student.id === studentId ? { ...student, guardians: [...student.guardians, guardian] } : student,
  );
  writeStudents(updated);
  return guardian;
}

export function issueIdentityCard(studentId: string) {
  return updateStudent(studentId, { idCard: { status: "Active", issued: new Date().toISOString().slice(0, 10), serial: `IDC-${Date.now()}` } });
}

export function deactivateIdentityCard(studentId: string) {
  return updateStudent(studentId, { idCard: { status: "Deactivated" } });
}

export function decideAdmissions(studentIds: string[], actor: string, decision: "approve" | "reject", reason?: string) {
  const students = readStudents();
  const nextStatus: StudentStatus = decision === "approve" ? "Active" : "Withdrawn";
  const updated = students.map((student) => studentIds.includes(student.id) && student.status === "Pending approval" ? { ...student, status: nextStatus } : student);
  writeStudents(updated);
  studentIds.forEach((studentId) => writeAuditEvent({ id: `AUD-${Date.now()}-${studentId}`, studentId, action: decision === "approve" ? "Admission approved" : "Admission rejected", actor, occurredAt: new Date().toISOString() }));
  return updated.filter((student) => studentIds.includes(student.id) && student.status === nextStatus);
}

export function transferStudent(studentId: string, toLevel: string, toArm: string, actor: string, effectiveDate: string, reason: string) {
  const student = readStudents().find((item) => item.id === studentId);
  if (!student || !reason.trim() || !effectiveDate) return false;
  updateStudent(studentId, { level: toLevel, arm: toArm });
  writeAuditEvent({ id: `AUD-${Date.now()}`, studentId, action: "Student transferred", actor, occurredAt: new Date().toISOString() });
  return true;
}

export function withdrawStudent(studentId: string, actor: string, effectiveDate: string, reason: string) {
  const student = readStudents().find((item) => item.id === studentId);
  if (!student || !reason.trim() || !effectiveDate) return false;
  updateStudent(studentId, { status: "Withdrawn" });
  writeAuditEvent({ id: `AUD-${Date.now()}`, studentId, action: `Student withdrawn: ${reason.trim()}`, actor, occurredAt: new Date().toISOString() });
  return true;
}

export function verifyGuardian(studentId: string, guardianId: string, actor: string) {
  const student = readStudents().find((item) => item.id === studentId);
  const guardian = student?.guardians.find((item) => item.id === guardianId);
  if (!student || !guardian) return false;
  const updated = student.guardians.map((item) => item.id === guardianId ? { ...item, verified: "Verified" as const } : item);
  updateStudent(studentId, { guardians: updated });
  writeAuditEvent({ id: `AUD-${Date.now()}`, studentId, action: `Guardian verified: ${guardian.name}`, actor, occurredAt: new Date().toISOString() });
  return true;
}