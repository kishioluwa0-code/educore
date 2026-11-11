import type { AuditEvent } from "../../drizzle/schema.js";

export type AuditEventInput = Partial<Pick<
  AuditEvent,
  | "schoolId"
  | "actorUserId"
  | "action"
  | "objectType"
  | "objectId"
  | "outcome"
  | "reason"
  | "requestId"
  | "ipAddress"
  | "userAgent"
>> & {
  schoolId: AuditEvent["schoolId"];
  actorUserId: AuditEvent["actorUserId"];
  action: AuditEvent["action"];
  objectType: AuditEvent["objectType"];
  outcome: AuditEvent["outcome"];
  requestId: AuditEvent["requestId"];
  objectId?: AuditEvent["objectId"];
  reason?: AuditEvent["reason"];
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "secret",
  "accessToken",
  "refreshToken",
]);

export function redactAuditSnapshot(value: Record<string, unknown> | undefined) {
  if (!value) return undefined;
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEYS.has(key) ? "[REDACTED]" : entry,
    ]),
  );
}
