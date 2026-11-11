import { useEffect, useState } from "react";

export type StaffStatus = "Draft" | "Pending verification" | "Active" | "On leave" | "Suspended" | "Exited";
export type StaffDocument = { id: string; name: string; category: "Certificate" | "Identity" | "Employment" | "Reference"; size: number; uploadedAt: string; status: "Uploaded" | "Pending verification" };
export type StaffRecord = {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: StaffStatus;
  email: string;
  phone: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  jobTitle: string;
  employmentStart: string;
  qualification: string;
  qualificationInstitution?: string;
  certificationNumber?: string;
  documents: StaffDocument[];
  qualificationStatus: "Pending" | "Verified";
  documentsComplete: boolean;
  address?: string;
  emergencyContact?: string;
  contractEnd?: string;
  lineManager?: string;
  payroll?: { bankName: string; accountNumber: string; taxNumber?: string; pensionNumber?: string; salary: number; currency: "NGN"; frequency: "Monthly" | "Termly"; effectiveFrom: string };
  salary?: { amount: number; currency: "NGN"; frequency: "Monthly" | "Termly"; effectiveFrom: string };
  updatedAt: string;
};

const STORAGE_KEY = "educore.staff-records";
const CHANGE_EVENT = "educore:staff-changed";

function readStaff(): StaffRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) as StaffRecord[] : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function seedStaff(staff: (typeof STAFF)[number]): StaffRecord {
  return {
    ...staff,
    status: staff.status === "On leave" ? "On leave" : "Active",
    email: `${staff.id.toLowerCase()}@educore.local`,
    phone: "+234 800 000 0000",
    employmentType: "Full-time",
    jobTitle: staff.role,
    employmentStart: "2024-09-01",
    qualification: "Staff record pending qualification details",
    documents: [],
    qualificationStatus: "Pending",
    documentsComplete: false,
    updatedAt: new Date(0).toISOString(),
  };
}

function writeStaff(records: StaffRecord[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getStaffRecords() {
  return readStaff();
}

export function getActiveTeachers() {
  return readStaff().filter((staff) => staff.status === "Active" && staff.role.toLowerCase().includes("teacher"));
}

export function saveStaffRecord(id: string, changes: Partial<StaffRecord>, actor: string) {
  if (actor !== "administrator" && actor !== "principal" && actor !== "hr") return null;
  const current = readStaff().find((staff) => staff.id === id);
  if (!current) return null;
  const next = { ...current, ...changes };
  if (next.status === "Active" && (next.qualificationStatus !== "Verified" || !next.documentsComplete)) return null;
  const updated = readStaff().map((staff) => staff.id === id ? { ...next, updatedAt: new Date().toISOString() } : staff);
  writeStaff(updated);
  return updated.find((staff) => staff.id === id) ?? null;
}

export function createStaffRecord(input: Pick<StaffRecord, "name" | "role" | "dept" | "email" | "phone" | "employmentType" | "jobTitle" | "employmentStart" | "qualification">, actor: string) {
  if (actor !== "administrator" && actor !== "principal" && actor !== "hr") return null;
  if (!input.name.trim() || !input.email.trim() || !input.phone.trim() || !input.qualification.trim()) return null;
  const records = readStaff();
  const id = `STF-${String(Date.now()).slice(-4)}`;
  const staff: StaffRecord = {
    ...input,
    id,
    status: "Pending verification",
    qualificationStatus: "Pending",
    documents: [],
    documentsComplete: false,
    updatedAt: new Date().toISOString(),
  };
  writeStaff([...records, staff]);
  return staff;
}

export function useStaffRecords() {
  const [records, setRecords] = useState<StaffRecord[]>(getStaffRecords);
  useEffect(() => {
    const refresh = () => setRecords(getStaffRecords());
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return records;
}
