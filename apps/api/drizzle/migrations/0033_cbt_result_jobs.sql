CREATE TYPE "public"."cbt_result_job_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "cbt_result_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL,
  "job_type" text NOT NULL,
  "work_key" text NOT NULL,
  "payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "cbt_result_job_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_error" text,
  "lease_owner" text,
  "lease_expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "cbt_result_jobs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action
);--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_result_jobs_work_key_unique" ON "cbt_result_jobs" USING btree ("work_key");--> statement-breakpoint
CREATE INDEX "cbt_result_jobs_claim_idx" ON "cbt_result_jobs" USING btree ("status", "next_run_at");--> statement-breakpoint
CREATE INDEX "cbt_result_jobs_lease_idx" ON "cbt_result_jobs" USING btree ("status", "lease_expires_at");
