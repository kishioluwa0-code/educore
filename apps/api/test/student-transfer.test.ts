import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { parseStudentCsv, studentsToCsv } from "../src/students/student-transfer.service.js";

const header = "admissionNo,firstName,middleName,lastName,dateOfBirth,gender,nationality,classId,armId,session";

const csv = `${header}\r\nADM-1,Ada,,Lovelace,2010-01-02,Female,Nigerian,class-1,arm-a,2026/2027`;
const parsed = parseStudentCsv(csv);
assert.equal(parsed.length, 1);
assert.equal(parsed[0]["firstName"], "Ada");

const exported = studentsToCsv([{ admissionNo: "ADM-1", firstName: "Ada", lastName: "Lovelace" }]);
assert.match(exported, /^admissionNo,firstName,middleName,lastName/);
assert.match(exported, /"Ada"/);

assert.throws(
  () => parseStudentCsv(`${header}\r\nADM-2,=HYPERLINK("https://bad"),,Unsafe,,,,,,`),
  (error: unknown) => error instanceof BadRequestException && error.message.includes("Formula-like"),
);

assert.throws(
  () => parseStudentCsv("admissionNo,firstName\r\nADM-3,Ada"),
  (error: unknown) => error instanceof BadRequestException && error.message.includes("headers"),
);

console.log("✓ Student CSV import/export safety validation passed");
