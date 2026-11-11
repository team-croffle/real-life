CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_title_length" CHECK (char_length("announcements"."title") >= 1 AND char_length("announcements"."title") <= 100),
	CONSTRAINT "announcements_body_length" CHECK (char_length("announcements"."body") >= 1 AND char_length("announcements"."body") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "reward_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"multiplier_tenths" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_events_multiplier_tenths" CHECK ("reward_events"."multiplier_tenths" >= 10 AND "reward_events"."multiplier_tenths" <= 30),
	CONSTRAINT "reward_events_period" CHECK ("reward_events"."ends_at" > "reward_events"."starts_at")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspend_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_suspend_reason_length" CHECK ("users"."suspend_reason" IS NULL OR char_length("users"."suspend_reason") <= 200);