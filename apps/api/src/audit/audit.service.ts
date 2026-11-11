import { Inject, Injectable } from "@nestjs/common";
import { auditEvents } from "../../drizzle/schema.js";
import { DatabaseService } from "../database/database.module.js";
import { redactAuditSnapshot, type AuditEventInput } from "./audit.types.js";

@Injectable()
export class AuditService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async record(event: AuditEventInput): Promise<void> {
    await this.database.db.insert(auditEvents).values({
      schoolId: event.schoolId,
      actorUserId: event.actorUserId,
      action: event.action,
      objectType: event.objectType,
      objectId: event.objectId,
      outcome: event.outcome,
      reason: event.reason,
      before: redactAuditSnapshot(event.before),
      after: redactAuditSnapshot(event.after),
      requestId: event.requestId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });
  }
}
