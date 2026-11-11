export const SCHOOL = {
  name: "Your School",
  shortName: "EduCore",
  motto: "Knowledge · Discipline · Service",
  address: "",
  session: "",
  term: "",
  status: "Setup required" as const,
};

export const SESSIONS = ["2026/2027", "2025/2026", "2024/2025"];
export const TERMS = ["First Term", "Second Term", "Third Term"];

export type StudentStatus = "Pending approval" | "Active" | "Suspended" | "Withdrawn" | "Graduated";
export type AttendanceState = "Present" | "Absent" | "Late" | "Excused";

export type Guardian = {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  occupation: string;
  verified: "Verified" | "Pending" | "Unverified";
  primary: boolean;
  financiallyResponsible: boolean;
  pickupAuthorized: boolean;
  address: string;
};

export type StudentDocument = {
  id: string;
  name: string;
  status: "Uploaded" | "Pending";
  size?: string;
};

export type Student = {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  genotype?: string;
  admissionType?: "Fresh admission" | "Transfer";
  previousSchool?: string;
  photoUrl?: string;
  gender: "Male" | "Female";
  dob: string;
  section: "Nursery" | "Primary" | "Junior Secondary" | "Senior Secondary";
  level: string;
  arm: string;
  status: StudentStatus;
  attendance: AttendanceState;
  attendanceRate: number;
  academicStatus: "On track" | "Needs support" | "Distinction" | "Probation";
  average: number;
  position: number;
  feeBalance: number;
  feeExpected: number;
  stateOfOrigin: string;
  lga: string;
  religion: string;
  bloodGroup: string;
  genotype: string;
  address: string;
  admittedOn: string;
  house: string;
  guardians: Guardian[];
  documents?: StudentDocument[];
  idCard: { status: "Active" | "Not generated" | "Deactivated"; issued?: string; serial?: string };
  documentsComplete: boolean;
};

const g = (
  id: string,
  name: string,
  relationship: string,
  phone: string,
  email: string,
  occupation: string,
  verified: Guardian["verified"],
  primary = false,
): Guardian => ({
  id,
  name,
  relationship,
  phone,
  email,
  occupation,
  verified,
  primary,
  financiallyResponsible: primary,
  pickupAuthorized: true,
  address: "12 Bode Thomas Street, Surulere, Lagos",
});

function make(
  i: number,
  first: string,
  last: string,
  gender: Student["gender"],
  section: Student["section"],
  level: string,
  arm: string,
  overrides: Partial<Student> = {},
): Student {
  const num = String(1420 + i);
  const attendanceStates: AttendanceState[] = ["Present", "Present", "Present", "Late", "Absent", "Excused"];
  const balance = [0, 45000, 120000, 0, 87500, 250000][i % 6]!;
  return {
    id: `GMC/${section === "Senior Secondary" ? "SS" : section === "Junior Secondary" ? "JS" : section === "Primary" ? "PR" : "NS"}/${num}`,
    admissionNo: `ADM-2026-${num}`,
    firstName: first,
    lastName: last,
    gender,
    dob: `20${10 + (i % 6)}-0${(i % 9) + 1}-1${i % 9}`,
    section,
    level,
    arm,
    status: "Active",
    attendance: attendanceStates[i % attendanceStates.length]!,
    attendanceRate: 88 + (i % 12),
    academicStatus: (["On track", "Distinction", "Needs support", "On track"] as const)[i % 4]!,
    average: 62 + ((i * 7) % 34),
    position: (i % 30) + 1,
    feeBalance: balance,
    feeExpected: 250000,
    stateOfOrigin: ["Lagos", "Ogun", "Oyo", "Anambra", "Kano", "Rivers", "Enugu", "Edo"][i % 8]!,
    lga: ["Ikeja", "Abeokuta South", "Ibadan North", "Onitsha", "Nassarawa", "Port Harcourt", "Nsukka", "Oredo"][i % 8]!,
    religion: i % 2 === 0 ? "Christianity" : "Islam",
    bloodGroup: ["O+", "A+", "B+", "AB+"][i % 4]!,
    genotype: ["AA", "AS", "AA", "AA"][i % 4]!,
    address: "24 Ogunlana Drive, Surulere, Lagos",
    admittedOn: "2026-09-14",
    house: ["Ruby", "Emerald", "Sapphire", "Topaz"][i % 4]!,
    guardians: [
      g(
        `GRD-${100 + i}`,
        `Mr. ${last} Adewale`,
        "Father",
        `+234 80${i}3 44${i} 91${i % 10}`,
        `${last.toLowerCase()}.father@mail.com`,
        "Civil Engineer",
        "Verified",
        true,
      ),
      g(
        `GRD-${200 + i}`,
        `Mrs. ${last} Adewale`,
        "Mother",
        `+234 81${i}2 77${i} 30${i % 10}`,
        `${last.toLowerCase()}.mother@mail.com`,
        "Pharmacist",
        i % 3 === 0 ? "Pending" : "Verified",
      ),
    ],
    idCard:
      i % 5 === 0
        ? { status: "Not generated" }
        : { status: "Active", issued: "2026-09-20", serial: `IDC-2026-${num}` },
    documentsComplete: i % 4 !== 0,
    ...overrides,
  };
}

const raw: Array<[string, string, Student["gender"], Student["section"], string, string]> = [
  ["Adaeze", "Okonkwo", "Female", "Senior Secondary", "SS 2", "A"],
  ["Chidi", "Balogun", "Male", "Senior Secondary", "SS 3", "B"],
  ["Fatima", "Yusuf", "Female", "Junior Secondary", "JSS 2", "A"],
  ["Emeka", "Nwachukwu", "Male", "Junior Secondary", "JSS 3", "C"],
  ["Zainab", "Bello", "Female", "Primary", "Primary 5", "B"],
  ["Tunde", "Ogunleye", "Male", "Senior Secondary", "SS 1", "A"],
  ["Ngozi", "Eze", "Female", "Junior Secondary", "JSS 1", "B"],
  ["Ibrahim", "Musa", "Male", "Primary", "Primary 4", "A"],
  ["Oluwaseun", "Adeyemi", "Female", "Senior Secondary", "SS 2", "C"],
  ["Kelechi", "Obi", "Male", "Junior Secondary", "JSS 2", "B"],
  ["Aisha", "Lawal", "Female", "Primary", "Primary 6", "A"],
  ["David", "Ifeanyi", "Male", "Senior Secondary", "SS 3", "A"],
  ["Halima", "Sanni", "Female", "Junior Secondary", "JSS 3", "A"],
  ["Segun", "Afolabi", "Male", "Primary", "Primary 3", "B"],
  ["Chiamaka", "Uche", "Female", "Senior Secondary", "SS 1", "B"],
  ["Yusuf", "Danjuma", "Male", "Junior Secondary", "JSS 1", "A"],
  ["Blessing", "Etim", "Female", "Nursery", "Nursery 2", "A"],
  ["Ahmed", "Garba", "Male", "Primary", "Primary 1", "A"],
  ["Temitope", "Ajayi", "Female", "Senior Secondary", "SS 2", "B"],
  ["Nnamdi", "Okeke", "Male", "Senior Secondary", "SS 3", "C"],
  ["Rukayat", "Salami", "Female", "Junior Secondary", "JSS 2", "C"],
  ["Peter", "Amadi", "Male", "Primary", "Primary 2", "B"],
  ["Amina", "Suleiman", "Female", "Primary", "Primary 5", "A"],
  ["Gbenga", "Oyelaran", "Male", "Junior Secondary", "JSS 3", "B"],
];

export const STUDENTS: Student[] = raw.map((r, i) => make(i, r[0], r[1], r[2], r[3], r[4], r[5]));

export const fullName = (s: Student) => `${s.firstName} ${s.lastName}`;

export const STAFF = [
  { id: "STF-0041", name: "School Administrator", role: "Administrator", dept: "Administration", status: "Active" },
  { id: "STF-0102", name: "Mr. Sunday Okafor", role: "Mathematics Teacher", dept: "Sciences", status: "Active" },
  { id: "STF-0118", name: "Mr. John Adeyinka", role: "Examination Officer", dept: "Examinations", status: "Active" },
  { id: "STF-0203", name: "Mrs. Grace Umeh", role: "Bursar", dept: "Finance", status: "Active" },
  { id: "STF-0233", name: "Mr. Ali Mohammed", role: "Head of Security", dept: "Operations", status: "On leave" },
];

export const ATTENDANCE_TREND = [
  { day: "Mon", present: 1148, absent: 62, late: 34 },
  { day: "Tue", present: 1181, absent: 41, late: 22 },
  { day: "Wed", present: 1164, absent: 55, late: 25 },
  { day: "Thu", present: 1132, absent: 78, late: 34 },
  { day: "Fri", present: 1096, absent: 112, late: 36 },
];

export const PERFORMANCE_BY_LEVEL = [
  { level: "JSS 1", average: 68 },
  { level: "JSS 2", average: 71 },
  { level: "JSS 3", average: 74 },
  { level: "SS 1", average: 69 },
  { level: "SS 2", average: 73 },
  { level: "SS 3", average: 78 },
];

export const FEE_COLLECTION = [
  { month: "Sep", collected: 78_500_000, expected: 96_000_000 },
  { month: "Oct", collected: 86_200_000, expected: 96_000_000 },
  { month: "Nov", collected: 91_400_000, expected: 96_000_000 },
  { month: "Dec", collected: 93_100_000, expected: 96_000_000 },
];

export type Attention = {
  id: string;
  label: string;
  count: number;
  tone: "danger" | "warning" | "info";
  to: string;
};

export const NEEDS_ATTENTION: Attention[] = [
  { id: "a1", label: "Attendance corrections pending approval", count: 18, tone: "warning", to: "/attendance" },
  { id: "a2", label: "Results awaiting review and approval", count: 7, tone: "danger", to: "/assessment" },
  { id: "a3", label: "Students with incomplete records", count: 12, tone: "warning", to: "/people/students" },
  { id: "a4", label: "Transfer requests pending", count: 5, tone: "info", to: "/people/students" },
  { id: "a5", label: "Fee disputes raised by guardians", count: 3, tone: "danger", to: "/finance" },
];

export const ACTIVITY = [
  { id: "1", who: "Mr. Sunday Okafor", what: "submitted JSS 2A Mathematics grade book", when: "2026-08-13T07:42:00Z" },
  { id: "2", who: "Mrs. Grace Umeh", what: "recorded a ₦250,000 fee payment for Adaeze Okonkwo", when: "2026-08-13T07:05:00Z" },
  { id: "3", who: "School Administrator", what: "approved 24 promotion records for JSS 3", when: "2026-08-12T16:20:00Z" },
  { id: "4", who: "System", what: "synced 27 offline attendance records from Gate Scanner 02", when: "2026-08-12T15:58:00Z" },
  { id: "5", who: "Mr. John Adeyinka", what: "published SS 3 mock examination results", when: "2026-08-12T11:30:00Z" },
];

export const APPROVALS = [
  { id: "REQ-2201", type: "Grade correction", requester: "Mr. Sunday Okafor", subject: "JSS 2A · Mathematics", date: "2026-08-13" },
  { id: "REQ-2198", type: "Guardian linking", requester: "Admissions Office", subject: "Fatima Yusuf · Uncle", date: "2026-08-12" },
  { id: "REQ-2195", type: "Fee adjustment", requester: "Mrs. Grace Umeh", subject: "Chidi Balogun · Scholarship", date: "2026-08-12" },
  { id: "REQ-2190", type: "Transfer request", requester: "Form Teacher SS 1B", subject: "Tunde Ogunleye · Arm transfer", date: "2026-08-11" },
];

export const EVENTS = [
  { id: "e1", title: "First Term Mid-term examination begins", date: "2026-08-24", tag: "Examinations" },
  { id: "e2", title: "PTA General Meeting", date: "2026-08-29", tag: "Community" },
  { id: "e3", title: "BECE registration closes", date: "2026-09-04", tag: "External exams" },
  { id: "e4", title: "Inter-house sports heats", date: "2026-09-11", tag: "Operations" },
];
