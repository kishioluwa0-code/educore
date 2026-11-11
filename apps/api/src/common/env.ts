import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_ORIGIN: z.string().url().default("http://localhost:4000"),
  DATABASE_URL: z.string().min(1).default("postgres://postgres:postgres@localhost:5432/educore"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must contain at least 32 characters"),
  EDUCORE_STORAGE_BACKEND: z.enum(["local", "s3"]).default("local"),
  EDUCORE_S3_BUCKET: z.string().min(1).optional(),
  EDUCORE_S3_REGION: z.string().min(1).default("us-east-1"),
  EDUCORE_S3_ENDPOINT: z.string().url().optional(),
  EDUCORE_S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  EDUCORE_S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  EDUCORE_CBT_WORKER_ENABLED: z.coerce.boolean().default(false),
}).superRefine((value, context) => {
  if (value.NODE_ENV === "production" && value.EDUCORE_STORAGE_BACKEND !== "s3") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EDUCORE_STORAGE_BACKEND"],
      message: "Production requires EDUCORE_STORAGE_BACKEND=s3; local private storage is development-only",
    });
  }
  if (value.NODE_ENV === "production" && !value.EDUCORE_S3_BUCKET) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["EDUCORE_S3_BUCKET"], message: "Production requires an S3 bucket" });
  }
  if (value.NODE_ENV === "production" && (!value.EDUCORE_S3_ACCESS_KEY_ID || !value.EDUCORE_S3_SECRET_ACCESS_KEY)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["EDUCORE_S3_ACCESS_KEY_ID"], message: "Production requires S3 credentials" });
  }
});

export type ApiEnv = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid API environment: ${issues}`);
  }
  return parsed.data;
}
