CREATE TABLE "cbt_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"configuration_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" integer NOT NULL,
	"max_score" integer NOT NULL,
	"pending_manual_count" integer DEFAULT 0 NOT NULL,
	"breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'marked' NOT NULL,
	"marked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"marked_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cbt_results" ADD CONSTRAINT "cbt_results_attempt_id_cbt_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."cbt_attempts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_results" ADD CONSTRAINT "cbt_results_configuration_id_exam_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."exam_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_results" ADD CONSTRAINT "cbt_results_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_results" ADD CONSTRAINT "cbt_results_marked_by_user_id_users_id_fk" FOREIGN KEY ("marked_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_results" ADD CONSTRAINT "cbt_results_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_results_attempt_unique" ON "cbt_results" USING btree ("attempt_id");--> statement-breakpoint
CREATE INDEX "cbt_results_configuration_status_idx" ON "cbt_results" USING btree ("configuration_id","status");--> statement-breakpoint
CREATE INDEX "cbt_results_student_status_idx" ON "cbt_results" USING btree ("student_id","status");