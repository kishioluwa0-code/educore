CREATE TABLE "attendance_records" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "school_id" uuid NOT NULL REFERENCES "schools"("id") ON DELETE cascade,
  "class_id" text NOT NULL,
  "arm_id" text NOT NULL,
  "session" text NOT NULL,
  "term" text NOT NULL,
  "attendance_date" date NOT NULL,
  "entries" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "submitted_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "reviewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE set null,
  "review_reason" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "attendance_school_class_date_unique" UNIQUE("school_id", "class_id", "arm_id", "attendance_date")
);
CREATE INDEX "attendance_school_status_idx" ON "attendance_records" ("school_id", "status", "attendance_date");
