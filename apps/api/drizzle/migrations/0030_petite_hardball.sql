CREATE TABLE "assessment_score_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"grade_row_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"component_key" text NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD COLUMN "gradebook_id" uuid;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD COLUMN "grade_component_key" text;--> statement-breakpoint
ALTER TABLE "assessment_score_sources" ADD CONSTRAINT "assessment_score_sources_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_score_sources" ADD CONSTRAINT "assessment_score_sources_grade_row_id_grade_rows_id_fk" FOREIGN KEY ("grade_row_id") REFERENCES "public"."grade_rows"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_score_sources" ADD CONSTRAINT "assessment_score_sources_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_score_sources_source_unique" ON "assessment_score_sources" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "assessment_score_sources_gradebook_student_idx" ON "assessment_score_sources" USING btree ("gradebook_id","student_id");