CREATE TYPE "public"."ai_task_kind" AS ENUM('monster');--> statement-breakpoint
CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "ai_task_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"status" "ai_task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_tasks_status_run_at_idx" ON "ai_tasks" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "ai_tasks_user_id_idx" ON "ai_tasks" USING btree ("user_id");