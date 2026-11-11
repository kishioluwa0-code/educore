CREATE TABLE "cbt_pool_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool_id" uuid NOT NULL,
	"question_version_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cbt_pools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"mode" text NOT NULL,
	"result_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"published_by_user_id" uuid,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cbt_pool_questions" ADD CONSTRAINT "cbt_pool_questions_pool_id_cbt_pools_id_fk" FOREIGN KEY ("pool_id") REFERENCES "public"."cbt_pools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_pool_questions" ADD CONSTRAINT "cbt_pool_questions_question_version_id_question_bank_versions_id_fk" FOREIGN KEY ("question_version_id") REFERENCES "public"."question_bank_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_pools" ADD CONSTRAINT "cbt_pools_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_pools" ADD CONSTRAINT "cbt_pools_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cbt_pools" ADD CONSTRAINT "cbt_pools_published_by_user_id_users_id_fk" FOREIGN KEY ("published_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_pool_question_position_unique" ON "cbt_pool_questions" USING btree ("pool_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_pool_question_version_unique" ON "cbt_pool_questions" USING btree ("pool_id","question_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_pools_school_code_unique" ON "cbt_pools" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "cbt_pools_school_mode_status_idx" ON "cbt_pools" USING btree ("school_id","mode","status");