CREATE TYPE "public"."quest_category" AS ENUM('exercise', 'life', 'study', 'work', 'creation', 'mind');--> statement-breakpoint
CREATE TYPE "public"."quest_difficulty" AS ENUM('easy', 'normal', 'hard');--> statement-breakpoint
CREATE TYPE "public"."quest_kind" AS ENUM('general', 'main');--> statement-breakpoint
CREATE TYPE "public"."quest_schedule" AS ENUM('routine', 'deadline');--> statement-breakpoint
CREATE TYPE "public"."quest_weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "quest_kind" NOT NULL,
	"category" "quest_category" NOT NULL,
	"title" text NOT NULL,
	"difficulty" "quest_difficulty" NOT NULL,
	"schedule" "quest_schedule" NOT NULL,
	"weekdays" "quest_weekday"[],
	"biweekly" boolean,
	"ends_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quests_schedule_xor" CHECK ((
        (
          "quests"."schedule" = 'routine'
          AND "quests"."ends_on" IS NULL
          AND "quests"."weekdays" IS NOT NULL
          AND cardinality("quests"."weekdays") >= 1
          AND "quests"."biweekly" IS NOT NULL
        )
        OR
        (
          "quests"."schedule" = 'deadline'
          AND "quests"."ends_on" IS NOT NULL
          AND "quests"."weekdays" IS NULL
          AND "quests"."biweekly" IS NULL
        )
      ))
);
--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quests_user_id_idx" ON "quests" USING btree ("user_id");