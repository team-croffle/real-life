DELETE FROM "user_rewards";--> statement-breakpoint
ALTER TABLE "user_rewards" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."shop_kind";--> statement-breakpoint
CREATE TYPE "public"."shop_kind" AS ENUM('hobby', 'rest', 'food', 'outing', 'shopping');--> statement-breakpoint
ALTER TABLE "user_rewards" ALTER COLUMN "kind" SET DATA TYPE "public"."shop_kind" USING "kind"::"public"."shop_kind";
