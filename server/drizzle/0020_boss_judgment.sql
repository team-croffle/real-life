CREATE TYPE "public"."boss_result" AS ENUM('cleared', 'failed', 'abandoned');--> statement-breakpoint
ALTER TYPE "public"."wallet_entry_kind" ADD VALUE 'boss_clear';--> statement-breakpoint
ALTER TYPE "public"."wallet_entry_kind" ADD VALUE 'boss_fail';--> statement-breakpoint
ALTER TYPE "public"."wallet_entry_kind" ADD VALUE 'boss_abandon';--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "result" "boss_result";--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_result_judged_at" CHECK (("bosses"."result" IS NULL) = ("bosses"."judged_at" IS NULL));