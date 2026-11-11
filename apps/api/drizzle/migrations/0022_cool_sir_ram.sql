CREATE TABLE "attendance_sync_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"operation_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"request_fingerprint" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attendance_record_id" uuid,
	"conflict_reason" text,
	"reconciled_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_sync_operations" ADD CONSTRAINT "attendance_sync_operations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sync_operations" ADD CONSTRAINT "attendance_sync_operations_attendance_record_id_attendance_records_id_fk" FOREIGN KEY ("attendance_record_id") REFERENCES "public"."attendance_records"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sync_operations" ADD CONSTRAINT "attendance_sync_operations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_sync_school_operation_unique" ON "attendance_sync_operations" USING btree ("school_id","operation_id");--> statement-breakpoint
CREATE INDEX "attendance_sync_school_status_idx" ON "attendance_sync_operations" USING btree ("school_id","status","created_at");