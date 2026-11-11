import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../../drizzle/schema.js";

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, {
    prepare: false,
    max: 10,
  });
  return {
    client,
    db: drizzle(client, { schema }),
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];
