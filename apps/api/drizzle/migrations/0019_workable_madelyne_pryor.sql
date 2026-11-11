CREATE TABLE "student_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"from_class_id" text,
	"from_arm_id" text,
	"to_class_id" text,
	"to_arm_id" text,
	"effective_date" timestamp with time zone NOT NULL,
	"reason" text NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_movements" ADD CONSTRAINT "student_movements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_movements" ADD CONSTRAINT "student_movements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_movements" ADD CONSTRAINT "student_movements_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_movements" ADD CONSTRAINT "student_movements_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_movements_student_session_unique" ON "student_movements" USING btree ("student_id","session_id");--> statement-breakpoint
CREATE INDEX "student_movements_school_session_idx" ON "student_movements" USING btree ("school_id","session_id");