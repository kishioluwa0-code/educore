CREATE TABLE "academic_arms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"section" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "academic_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"attendance_record_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"owner_user_id" uuid,
	"note" text,
	"contacted_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"arm_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"attendance_date" timestamp with time zone NOT NULL,
	"entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"idempotency_key" text,
	"request_fingerprint" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"submitted_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"review_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gradebook_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"scores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"submitted_at" timestamp with time zone,
	"submitted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gradebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"arm_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"term_id" uuid,
	"subject_id" uuid,
	"component_policy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_class_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"arm_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"term_id" uuid,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teacher_subject_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"teacher_user_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"arm_id" uuid,
	"session_id" uuid NOT NULL,
	"term_id" uuid,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_setup" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "user_credentials" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "academic_arms" ADD CONSTRAINT "academic_arms_class_id_academic_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."academic_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_classes" ADD CONSTRAINT "academic_classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_sessions" ADD CONSTRAINT "academic_sessions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_subjects" ADD CONSTRAINT "academic_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_exceptions" ADD CONSTRAINT "attendance_exceptions_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_academic_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."academic_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_arm_id_academic_arms_id_fk" FOREIGN KEY ("arm_id") REFERENCES "public"."academic_arms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_rows" ADD CONSTRAINT "grade_rows_gradebook_id_gradebooks_id_fk" FOREIGN KEY ("gradebook_id") REFERENCES "public"."gradebooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_rows" ADD CONSTRAINT "grade_rows_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_rows" ADD CONSTRAINT "grade_rows_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_class_id_academic_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."academic_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_arm_id_academic_arms_id_fk" FOREIGN KEY ("arm_id") REFERENCES "public"."academic_arms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gradebooks" ADD CONSTRAINT "gradebooks_subject_id_academic_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_class_id_academic_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."academic_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_arm_id_academic_arms_id_fk" FOREIGN KEY ("arm_id") REFERENCES "public"."academic_arms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_class_assignments" ADD CONSTRAINT "teacher_class_assignments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_teacher_user_id_users_id_fk" FOREIGN KEY ("teacher_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_subject_id_academic_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_class_id_academic_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."academic_classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_arm_id_academic_arms_id_fk" FOREIGN KEY ("arm_id") REFERENCES "public"."academic_arms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teacher_subject_assignments" ADD CONSTRAINT "teacher_subject_assignments_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "academic_arms_class_name_unique" ON "academic_arms" USING btree ("class_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_classes_school_name_unique" ON "academic_classes" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_sessions_school_name_unique" ON "academic_sessions" USING btree ("school_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_subjects_school_code_unique" ON "academic_subjects" USING btree ("school_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "academic_terms_session_name_unique" ON "academic_terms" USING btree ("session_id","name");--> statement-breakpoint
CREATE INDEX "attendance_exceptions_school_status_idx" ON "attendance_exceptions" USING btree ("school_id","status","created_at");--> statement-breakpoint
CREATE INDEX "attendance_exceptions_record_student_idx" ON "attendance_exceptions" USING btree ("attendance_record_id","student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_school_class_date_unique" ON "attendance_records" USING btree ("school_id","class_id","arm_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_school_status_idx" ON "attendance_records" USING btree ("school_id","status","attendance_date");--> statement-breakpoint
CREATE INDEX "grade_rows_gradebook_idx" ON "grade_rows" USING btree ("gradebook_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grade_rows_unique_student" ON "grade_rows" USING btree ("gradebook_id","student_id");--> statement-breakpoint
CREATE INDEX "grade_rows_student_idx" ON "grade_rows" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "gradebooks_school_idx" ON "gradebooks" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "gradebooks_unique_scope" ON "gradebooks" USING btree ("school_id","class_id","arm_id","session_id","term_id","subject_id");--> statement-breakpoint
CREATE INDEX "teacher_class_assignments_scope_idx" ON "teacher_class_assignments" USING btree ("school_id","teacher_user_id","session_id","term_id");--> statement-breakpoint
CREATE INDEX "teacher_subject_assignments_scope_idx" ON "teacher_subject_assignments" USING btree ("school_id","teacher_user_id","session_id","term_id");