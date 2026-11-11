CREATE TABLE "cbt_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"question_order" jsonb NOT NULL,
	"answers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"last_autosave_sequence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cbt_autosaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"operation_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"answers" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cbt_attempts" ADD CONSTRAINT "cbt_attempts_configuration_id_exam_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."exam_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_attempts" ADD CONSTRAINT "cbt_attempts_candidate_id_exam_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."exam_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_attempts" ADD CONSTRAINT "cbt_attempts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_autosaves" ADD CONSTRAINT "cbt_autosaves_attempt_id_cbt_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."cbt_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_attempts_configuration_student_unique" ON "cbt_attempts" USING btree ("configuration_id","student_id");--> statement-breakpoint
CREATE INDEX "cbt_attempts_student_status_idx" ON "cbt_attempts" USING btree ("student_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_autosaves_attempt_operation_unique" ON "cbt_autosaves" USING btree ("attempt_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_autosaves_attempt_sequence_unique" ON "cbt_autosaves" USING btree ("attempt_id","sequence");