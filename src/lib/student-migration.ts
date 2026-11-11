import { getStudents } from "@/data/student-store";
import {
  createServerStudent,
  listServerStudents,
  StudentApiError,
  type ServerStudent,
  type StudentCreateRequest,
} from "@/lib/student-api";
import type { Student } from "@/data/school";

export type MigrationClassification = "create" | "already-migrated" | "conflict";

export type StudentMigrationRow = {
  classification: MigrationClassification;
  localId: string;
  admissionNo: string;
  local: Student;
  server?: ServerStudent;
  differences: string[];
  payload: StudentCreateRequest;
};

export type StudentMigrationPlan = {
  generatedAt: string;
  total: number;
  create: StudentMigrationRow[];
  alreadyMigrated: StudentMigrationRow[];
  conflicts: StudentMigrationRow[];
};

export type StudentMigrationExecutionRow = StudentMigrationRow & {
  result: "created" | "conflict" | "failed" | "skipped";
  serverId?: string;
  error?: string;
};

export type StudentMigrationExecutionReport = {
  generatedAt: string;
  sourcePlanGeneratedAt: string;
  rows: StudentMigrationExecutionRow[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function payloadFor(local: Student): StudentCreateRequest {
  return {
    admissionNo: local.admissionNo,
    firstName: local.firstName.trim(),
    middleName: local.otherName?.trim() || undefined,
    lastName: local.lastName.trim(),
    dateOfBirth: local.dob || undefined,
    gender: local.gender,
    classId: local.level,
    armId: local.arm,
    session: "2026/2027",
  };
}

function differences(local: Student, server: ServerStudent) {
  const checks: Array<[string, string, string]> = [
    ["firstName", normalize(local.firstName), normalize(server.firstName)],
    ["lastName", normalize(local.lastName), normalize(server.lastName)],
    ["gender", normalize(local.gender), normalize(server.gender)],
    ["classId", normalize(local.level), normalize(server.classId)],
    ["armId", normalize(local.arm), normalize(server.armId)],
    ["dateOfBirth", normalize(local.dob), normalize(server.dateOfBirth?.slice(0, 10))],
  ];
  return checks.filter(([, localValue, serverValue]) => localValue !== serverValue).map(([field]) => field);
}

export function buildStudentMigrationPlan(
  localStudents: Student[],
  serverStudents: ServerStudent[],
): StudentMigrationPlan {
  const serverByAdmission = new Map(
    serverStudents.map((student) => [normalize(student.admissionNo), student]),
  );
  const rows = localStudents.map((local) => {
    const server = serverByAdmission.get(normalize(local.admissionNo));
    const rowBase = {
      localId: local.id,
      admissionNo: local.admissionNo,
      local,
      server,
      differences: server ? differences(local, server) : [],
      payload: payloadFor(local),
    };
    return {
      ...rowBase,
      classification: !server
        ? ("create" as const)
        : rowBase.differences.length
          ? ("conflict" as const)
          : ("already-migrated" as const),
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    create: rows.filter((row) => row.classification === "create"),
    alreadyMigrated: rows.filter((row) => row.classification === "already-migrated"),
    conflicts: rows.filter((row) => row.classification === "conflict"),
  };
}

export async function previewLocalStudentMigration(signal?: AbortSignal) {
  const serverStudents = await listServerStudents(signal);
  return buildStudentMigrationPlan(getStudents(), serverStudents);
}

export async function executeStudentMigration(
  plan: StudentMigrationPlan,
  signal?: AbortSignal,
): Promise<StudentMigrationExecutionReport> {
  const rows: StudentMigrationExecutionRow[] = [
    ...plan.alreadyMigrated.map((row) => ({ ...row, result: "skipped" as const })),
    ...plan.conflicts.map((row) => ({
      ...row,
      result: "conflict" as const,
      error: `Existing server record differs: ${row.differences.join(", ")}`,
    })),
  ];

  for (const row of plan.create) {
    if (signal?.aborted) throw new DOMException("Migration cancelled", "AbortError");
    try {
      const created = await createServerStudent(row.payload);
      rows.push({ ...row, result: "created", serverId: created.id });
    } catch (error: unknown) {
      if (error instanceof StudentApiError && error.status === 409) {
        rows.push({ ...row, result: "conflict", error: error.message });
      } else {
        rows.push({
          ...row,
          result: "failed",
          error: error instanceof Error ? error.message : "Unable to migrate student",
        });
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sourcePlanGeneratedAt: plan.generatedAt,
    rows,
  };
}

export function downloadStudentMigrationReport(report: StudentMigrationExecutionReport) {
  if (typeof window === "undefined") return;
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `educore-student-migration-${report.generatedAt.slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}