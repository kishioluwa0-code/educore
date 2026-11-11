ALTER TABLE "student_guardians" ADD COLUMN "guardian_user_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_user_id_users_id_fk" FOREIGN KEY ("guardian_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_guardians_user_idx" ON "student_guardians" USING btree ("guardian_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_user_unique" ON "students" USING btree ("school_id","user_id");