ALTER TABLE "gradebook_submissions" ADD COLUMN "manual_correction_used" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD COLUMN "manual_corrected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD COLUMN "manual_corrected_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "gradebook_submissions" ADD CONSTRAINT "gradebook_submissions_manual_corrected_by_user_id_users_id_fk" FOREIGN KEY ("manual_corrected_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;