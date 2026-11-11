CREATE TABLE "grade_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_submission_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gradebook_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"reviewed_by_user_id" uuid,
	"review_feedback" jsonb,
	"published_at" timestamp with time zone,
	"published_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "grade_snapshots" ADD CONSTRAINT "grade_snapshots_gradebook_submission_id_gradebook_submissions_id_fk" FOREIGN KEY ("gradebook_submission_id") REFERENCES "public"."gradebook_submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_snapshots" ADD CONSTRAINT "grade_snapshots_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD CONSTRAINT "gradebook_submissions_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD CONSTRAINT "gradebook_submissions_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD CONSTRAINT "gradebook_submissions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD CONSTRAINT "gradebook_submissions_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "grade_snapshots_unique_submission_student" ON "grade_snapshots" USING btree ("gradebook_submission_id","student_id");--> statement-breakpoint
CREATE INDEX "grade_snapshots_submission_idx" ON "grade_snapshots" USING btree ("gradebook_submission_id");--> statement-breakpoint
CREATE INDEX "gradebook_submissions_gradebook_idx" ON "gradebook_submissions" USING btree ("gradebook_id");--> statement-breakpoint
CREATE INDEX "gradebook_submissions_status_idx" ON "gradebook_submissions" USING btree ("status");