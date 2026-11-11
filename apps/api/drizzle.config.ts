import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./apps/api/drizzle/schema.ts",
  out: "./apps/api/drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "postgres://postgres:postgres@localhost:5432/educore",
  },
  strict: true,
  verbose: true,
});
