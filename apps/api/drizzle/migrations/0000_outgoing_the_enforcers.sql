CREATE TYPE "public"."audit_outcome" AS ENUM('allowed', 'denied');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('invited', 'active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."school_status" AS ENUM('trial', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'invited', 'suspended', 'disabled');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text,
	"outcome" "audit_outcome" NOT NULL,
	"reason" text,
	"before" jsonb,
	"after" jsonb,
	"request_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_roles" (
	"membership_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "membership_roles_membership_id_role_id_pk" PRIMARY KEY("membership_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "role_capabilities" (
	"role_id" uuid NOT NULL,
	"capability_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_capabilities_role_id_capability_id_pk" PRIMARY KEY("role_id","capability_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"status" "school_status" DEFAULT 'trial' NOT NULL,
	"timezone" text DEFAULT 'Africa/Lagos' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"active_school_id" uuid,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_subject" text,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"phone" text,
	"status" "user_status" DEFAULT 'invited' NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_membership_id_school_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."school_memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_roles" ADD CONSTRAINT "membership_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_capability_id_capabilities_id_fk" FOREIGN KEY ("capability_id") REFERENCES "public"."capabilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_memberships" ADD CONSTRAINT "school_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_active_school_id_schools_id_fk" FOREIGN KEY ("active_school_id") REFERENCES "public"."schools"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_school_created_idx" ON "audit_events" USING btree ("school_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_actor_created_idx" ON "audit_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_object_idx" ON "audit_events" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "audit_events_request_idx" ON "audit_events" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "capabilities_key_unique" ON "capabilities" USING btree ("key");--> statement-breakpoint
CREATE INDEX "capabilities_domain_idx" ON "capabilities" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "membership_roles_role_idx" ON "membership_roles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "role_capabilities_capability_idx" ON "role_capabilities" USING btree ("capability_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_key_unique" ON "roles" USING btree ("key");--> statement-breakpoint
CREATE UNIQUE INDEX "school_memberships_school_user_unique" ON "school_memberships" USING btree ("school_id","user_id");--> statement-breakpoint
CREATE INDEX "school_memberships_user_idx" ON "school_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "school_memberships_school_status_idx" ON "school_memberships" USING btree ("school_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "schools_slug_unique" ON "schools" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "schools_status_idx" ON "schools" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_unique" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_active_idx" ON "sessions" USING btree ("expires_at","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_external_subject_unique" ON "users" USING btree ("external_subject");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");