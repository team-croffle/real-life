ALTER TABLE "bosses" ADD COLUMN "result_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "xp_change" integer;--> statement-breakpoint
UPDATE "bosses" SET "result_seen_at" = "judged_at" WHERE "result" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_result_seen_at" CHECK ("bosses"."result_seen_at" IS NULL OR "bosses"."result" IS NOT NULL);--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_result_xp_change" CHECK ("bosses"."result" IS NOT NULL OR "bosses"."xp_change" IS NULL);