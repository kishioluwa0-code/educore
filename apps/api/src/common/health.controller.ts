import { Controller, Get, Inject, ServiceUnavailableException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { DatabaseService } from "../database/database.module.js";
import { cbtResultJobs } from "../../drizzle/schema.js";

@Controller("health")
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get("live")
  live() {
    return { status: "ok", service: "educore-api" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.database.db.execute(sql`select 1`);
      const [jobs] = await this.database.db
        .select({
          pending: sql<number>`count(*) filter (where ${cbtResultJobs.status} = 'pending')`,
          running: sql<number>`count(*) filter (where ${cbtResultJobs.status} = 'running')`,
          failed: sql<number>`count(*) filter (where ${cbtResultJobs.status} = 'failed')`,
        })
        .from(cbtResultJobs);
      return {
        status: "ok",
        service: "educore-api",
        dependencies: { database: "ok" },
        operations: { cbtResultJobs: jobs },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: "not_ready",
        service: "educore-api",
        dependencies: { database: "unavailable" },
      });
    }
  }
}
