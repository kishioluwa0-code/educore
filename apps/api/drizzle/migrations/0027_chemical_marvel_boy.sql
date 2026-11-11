CREATE TABLE "cbt_attempt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"operation_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cbt_attempts" ADD COLUMN "last_event_sequence" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cbt_attempt_events" ADD CONSTRAINT "cbt_attempt_events_attempt_id_cbt_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."cbt_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_attempt_events_attempt_operation_unique" ON "cbt_attempt_events" USING btree ("attempt_id","operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cbt_attempt_events_attempt_sequence_unique" ON "cbt_attempt_events" USING btree ("attempt_id","sequence");--> statement-breakpoint
CREATE INDEX "cbt_attempt_events_attempt_created_idx" ON "cbt_attempt_events" USING btree ("attempt_id","created_at");