CREATE TYPE "public"."student_document_status" AS ENUM('pending', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."student_status" AS ENUM('pending', 'approved', 'rejected', 'transferred', 'withdrawn');--> statement-breakpoint
CREATE TABLE "student_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"requirement_key" text NOT NULL,
	"storage_key" text NOT NULL,
	"checksum" text NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"status" "student_document_status" DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"uploaded_by_user_id" uuid,
	"verified_by_user_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text,
	"email" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"admission_no" text NOT NULL,
	"first_name" text NOT NULL,
	"middle_name" text,
	"last_name" text NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"nationality" text,
	"class_id" text,
	"arm_id" text,
	"session" text,
	"status" "student_status" DEFAULT 'pending' NOT NULL,
	"admitted_at" timestamp with time zone,
	"withdrawn_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_documents_storage_key_unique" ON "student_documents" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "student_documents_student_idx" ON "student_documents" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "student_documents_school_requirement_idx" ON "student_documents" USING btree ("school_id","requirement_key","status");--> statement-breakpoint
CREATE INDEX "student_guardians_student_idx" ON "student_guardians" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "student_guardians_school_idx" ON "student_guardians" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "students_school_admission_unique" ON "students" USING btree ("school_id","admission_no");--> statement-breakpoint
CREATE INDEX "students_school_status_idx" ON "students" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "students_school_name_idx" ON "students" USING btree ("school_id","last_name","first_name");