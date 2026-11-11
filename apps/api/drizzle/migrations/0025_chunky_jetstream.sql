CREATE TABLE "exam_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"configuration_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exam_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"pool_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"snapshot_at" timestamp with time zone,
	"created_by_user_id" uuid NOT NULL,
	"published_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exam_candidates" ADD CONSTRAINT "exam_candidates_configuration_id_exam_configurations_id_fk" FOREIGN KEY ("configuration_id") REFERENCES "public"."exam_configurations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_candidates" ADD CONSTRAINT "exam_candidates_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_pool_id_cbt_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."cbt_pools"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_session_id_academic_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."academic_sessions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exam_configurations" ADD CONSTRAINT "exam_configurations_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exam_candidates_configuration_student_unique" ON "exam_candidates" USING btree ("configuration_id","student_id");--> statement-breakpoint
CREATE INDEX "exam_candidates_configuration_idx" ON "exam_candidates" USING btree ("configuration_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_configurations_school_code_unique" ON "exam_configurations" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "exam_configurations_school_status_idx" ON "exam_configurations" USING btree ("school_id","status","opens_at");