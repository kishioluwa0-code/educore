CREATE TABLE "question_bank_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"subject_id" uuid,
	"code" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"retired_at" timestamp with time zone,
	"retired_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_bank_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"type" text NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"points" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_subject_id_academic_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."academic_subjects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_retired_by_user_id_users_id_fk" FOREIGN KEY ("retired_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_question_id_question_bank_items_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."question_bank_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_bank_versions" ADD CONSTRAINT "question_bank_versions_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_bank_school_code_unique" ON "question_bank_items" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "question_bank_school_status_idx" ON "question_bank_items" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "question_bank_question_version_unique" ON "question_bank_versions" USING btree ("question_id","version");--> statement-breakpoint
CREATE INDEX "question_bank_version_status_idx" ON "question_bank_versions" USING btree ("question_id","status");