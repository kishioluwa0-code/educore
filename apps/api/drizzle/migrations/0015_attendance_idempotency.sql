ALTER TABLE "attendance_records" ADD COLUMN "idempotency_key" text;
ALTER TABLE "attendance_records" ADD COLUMN "request_fingerprint" text;
CREATE UNIQUE INDEX "attendance_school_idempotency_unique" ON "attendance_records" ("school_id", "idempotency_key");