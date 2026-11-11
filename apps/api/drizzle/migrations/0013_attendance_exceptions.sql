CREATE TABLE "attendance_exceptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "attendance_record_id" uuid NOT NULL REFERENCES "attendance_records"("id") ON DELETE cascade,
  "student_id" uuid NOT NULL REFERENCES "students"("id") ON DELETE cascade,
  "kind" text NOT NULL,
  "status" text DEFAULT 'open' NOT NULL,
  "owner_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "note" text,
  "contacted_at" timestamptz,
  "resolved_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX "attendance_exceptions_school_status_idx" ON "attendance_exceptions" ("school_id", "status", "created_at");
CREATE INDEX "attendance_exceptions_record_student_idx" ON "attendance_exceptions" ("attendance_record_id", "student_id");