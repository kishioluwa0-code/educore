import assert from "node:assert/strict";
import postgres from "postgres";
import { CbtResultJobRepository } from "../src/exams/cbt-result-job.repository.js";
import { DatabaseService } from "../src/database/database.module.js";

const sql = postgres(process.env["DATABASE_URL"] ?? "postgres://localhost:5432/educore");

async function run() {
  const suffix = Date.now().toString();
  const database = new DatabaseService();
  let schoolId = "";
  try {
    const [school] = await sql`insert into schools (slug, name, status) values (${`job-load-${suffix}`}, 'Job Load Test', 'active') returning id`;
    schoolId = String(school["id"]);
    const repository = new CbtResultJobRepository(database);
    const jobs = await Promise.all(
      Array.from({ length: 100 }, (_, index) =>
        repository.enqueue(schoolId, "reconciliation", `load-${suffix}-${index}`, { resultId: `load-${index}`, requestedByUserId: "00000000-0000-0000-0000-000000000000" }),
      ),
    );
    const claimed = await Promise.all(Array.from({ length: 100 }, (_, index) => repository.claim(`load-worker-${index}`)));
    const claimedIds = claimed.filter((job): job is NonNullable<typeof job> => Boolean(job)).map((job) => job.id);
    assert.equal(jobs.length, 100);
    assert.equal(new Set(claimedIds).size, 100);
    console.log("✓ 100 concurrent durable CBT jobs were claimed without duplicate ownership");
  } finally {
    if (schoolId) await sql`delete from schools where id = ${schoolId}`;
    await database.onModuleDestroy();
    await sql.end();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
