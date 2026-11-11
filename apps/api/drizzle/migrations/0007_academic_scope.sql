CREATE TABLE "academic_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "status" text DEFAULT 'planned' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "academic_sessions_school_name_unique" UNIQUE("school_id", "name")
);
CREATE TABLE "academic_terms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "starts_at" timestamptz,
  "ends_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "academic_terms_session_name_unique" UNIQUE("session_id", "name")
);
CREATE TABLE "academic_classes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "section" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "academic_classes_school_name_unique" UNIQUE("school_id", "name")
);
CREATE TABLE "academic_arms" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "class_id" uuid NOT NULL REFERENCES "academic_classes"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "academic_arms_class_name_unique" UNIQUE("class_id", "name")
);
CREATE TABLE "academic_subjects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "academic_subjects_school_code_unique" UNIQUE("school_id", "code")
);
CREATE TABLE "teacher_class_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "teacher_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "class_id" uuid NOT NULL REFERENCES "academic_classes"("id") ON DELETE cascade,
  "arm_id" uuid NOT NULL REFERENCES "academic_arms"("id") ON DELETE cascade,
  "session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE cascade,
  "term_id" uuid REFERENCES "academic_terms"("id") ON DELETE cascade,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "teacher_class_assignments_scope_idx" ON "teacher_class_assignments" ("school_id", "teacher_user_id", "session_id", "term_id");
CREATE TABLE "teacher_subject_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "teacher_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "subject_id" uuid NOT NULL REFERENCES "academic_subjects"("id") ON DELETE cascade,
  "class_id" uuid NOT NULL REFERENCES "academic_classes"("id") ON DELETE cascade,
  "arm_id" uuid REFERENCES "academic_arms"("id") ON DELETE cascade,
  "session_id" uuid NOT NULL REFERENCES "academic_sessions"("id") ON DELETE cascade,
  "term_id" uuid REFERENCES "academic_terms"("id") ON DELETE cascade,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "teacher_subject_assignments_scope_idx" ON "teacher_subject_assignments" ("school_id", "teacher_user_id", "session_id", "term_id");
