CREATE TABLE "cbt_question_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD COLUMN "questions_per_student" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "cbt_question_allocations" ADD CONSTRAINT "cbt_question_allocations_configuration_id_exam_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."exam_configurations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_question_allocations" ADD CONSTRAINT "cbt_question_allocations_candidate_id_exam_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."exam_candidates"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_question_allocations" ADD CONSTRAINT "cbt_question_allocations_question_version_id_question_bank_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_bank_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_question_allocations_candidate_position_unique" ON "cbt_question_allocations" USING btree ("candidate_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_question_allocations_configuration_question_unique" ON "cbt_question_allocations" USING btree ("configuration_id","question_version_id");--> statement-breakpoint
CREATE INDEX "cbt_question_allocations_configuration_candidate_idx" ON "cbt_question_allocations" USING btree ("configuration_id","candidate_id");