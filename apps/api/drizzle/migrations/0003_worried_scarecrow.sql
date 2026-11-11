CREATE TABLE "school_setup" (
	"school_id" uuid PRIMARY KEY NOT NULL,
	"short_code" text,
	"school_type" text,
	"state" text,
	"address" text,
	"official_phone" text,
	"official_email" text,
	"current_session" text,
	"current_term" text,
	"setup_step" integer DEFAULT 0 NOT NULL,
	"checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_setup" ADD CONSTRAINT "school_setup_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_setup" ADD CONSTRAINT "school_setup_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;