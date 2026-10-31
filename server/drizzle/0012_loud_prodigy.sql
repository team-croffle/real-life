CREATE TYPE "public"."quest_pace" AS ENUM('steady', 'once');--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "pace" "quest_pace";--> statement-breakpoint
UPDATE "quests" SET "pace" = 'steady' WHERE "schedule" = 'deadline';--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_pace" CHECK ((
        ("quests"."schedule" = 'routine' AND "quests"."pace" IS NULL)
        OR
        ("quests"."schedule" = 'deadline' AND "quests"."pace" IS NOT NULL)
      ));