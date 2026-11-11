import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { CAPABILITIES } from "../authorization/capabilities.js";
import { AuthorizationService } from "../authorization/authorization.service.js";
import { AuditService } from "../audit/audit.service.js";
import type { AuthenticatedPrincipal } from "../identity/types.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import { StudentRepository, type CreateStudentRecord } from "./student.repository.js";

const MAX_IMPORT_BYTES = 1_000_000;
const MAX_IMPORT_ROWS = 2_000;
const COLUMNS = ["admissionNo", "firstName", "middleName", "lastName", "dateOfBirth", "gender", "nationality", "classId", "armId", "session"] as const;

type ImportStudent = Omit<CreateStudentRecord, "schoolId" | "createdByUserId">;

@Injectable()
export class StudentTransferService {
  constructor(
    @Inject(StudentRepository) private readonly students: StudentRepository,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(TenantContextService) private readonly tenancy: TenantContextService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async exportCsv(principal: AuthenticatedPrincipal, requestId: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentRead);
    const rows = await this.students.listBySchool(schoolId);
    const csv = studentsToCsv(rows);
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.export",
      objectType: "student",
      outcome: "allowed",
      requestId,
      after: { rowCount: rows.length, format: "csv" },
    });
    return { csv, rowCount: rows.length };
  }

  async importCsv(principal: AuthenticatedPrincipal, requestId: string, content: string) {
    const schoolId = this.tenancy.resolveActiveMembership(principal).schoolId;
    this.authorization.requireCapability(principal, schoolId, CAPABILITIES.studentManage);
    if (Buffer.byteLength(content, "utf8") > MAX_IMPORT_BYTES) {
      throw new BadRequestException("CSV import exceeds the 1 MB limit");
    }
    const rows = parseStudentCsv(content);
    if (rows.length > MAX_IMPORT_ROWS) throw new BadRequestException("CSV import exceeds the 2,000-row limit");
    const records = rows.map((row, index) => {
      const admissionNo = required(row["admissionNo"], "admissionNo", index);
      const firstName = required(row["firstName"], "firstName", index);
      const lastName = required(row["lastName"], "lastName", index);
      const dateOfBirth = row["dateOfBirth"] ? new Date(row["dateOfBirth"]) : undefined;
      if (dateOfBirth && Number.isNaN(dateOfBirth.getTime())) throw new BadRequestException(`Invalid dateOfBirth on row ${index + 2}`);
      return { admissionNo, firstName, lastName, middleName: optional(row["middleName"]), dateOfBirth, gender: optional(row["gender"]), nationality: optional(row["nationality"]), classId: optional(row["classId"]), armId: optional(row["armId"]), session: optional(row["session"]) } satisfies ImportStudent;
    });
    const imported = await this.students.createMany(schoolId, principal.userId, records);
    await this.audit.record({
      schoolId,
      actorUserId: principal.userId,
      action: "student.import",
      objectType: "student",
      outcome: "allowed",
      requestId,
      after: { rowCount: imported.length, format: "csv" },
    });
    return { imported: imported.length };
  }
}

function required(value: string | undefined, field: string, row: number) {
  const result = optional(value);
  if (!result) throw new BadRequestException(`${field} is required on row ${row + 2}`);
  return result;
}

function optional(value: string | undefined) {
  return value?.trim() || undefined;
}

function csvCell(value: unknown) {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function studentsToCsv(rows: readonly Record<string, unknown>[]) {
  return [
    COLUMNS.join(","),
    ...rows.map((student) => COLUMNS.map((column) => csvCell(student[column])).join(",")),
  ].join("\r\n");
}

export function parseStudentCsv(content: string): Record<string, string | undefined>[] {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new BadRequestException("CSV import must include a header and at least one row");
  const headers = parseLine(lines[0]);
  if (headers.length !== COLUMNS.length || headers.some((header, index) => header !== COLUMNS[index])) {
    throw new BadRequestException(`CSV headers must be exactly: ${COLUMNS.join(",")}`);
  }
  return lines.slice(1).map((line, rowIndex) => {
    const cells = parseLine(line);
    if (cells.length !== headers.length) throw new BadRequestException(`CSV row ${rowIndex + 2} has an invalid column count`);
    if (cells.some((cell) => /^[\s]*[=+\-@]/.test(cell))) throw new BadRequestException(`Formula-like cell rejected on row ${rowIndex + 2}`);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]]));
  });
}

function parseLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { cells.push(cell); cell = ""; continue; }
    cell += character;
  }
  if (quoted) throw new BadRequestException("CSV contains an unterminated quoted field");
  cells.push(cell);
  return cells;
}
