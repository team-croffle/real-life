CREATE TYPE "public"."shop_kind" AS ENUM('game', 'video', 'dessert', 'delivery', 'outing');--> statement-breakpoint
ALTER TYPE "public"."wallet_entry_kind" ADD VALUE 'purchase';--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "shop_kind" NOT NULL,
	"price" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_rewards_price" CHECK ("user_rewards"."price" >= 1 AND "user_rewards"."price" <= 99999)
);
--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD COLUMN "purchased_name" text;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_rewards_user_id_idx" ON "user_rewards" USING btree ("user_id");
