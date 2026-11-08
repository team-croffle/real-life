ALTER TABLE "wallet_entries" ADD COLUMN "tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD COLUMN "quest_id" uuid;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD COLUMN "boss_id" uuid;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wallet_entries_quest_id_idx" ON "wallet_entries" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "wallet_entries_boss_id_idx" ON "wallet_entries" USING btree ("boss_id");--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_one_cause" CHECK ("wallet_entries"."quest_id" IS NULL OR "wallet_entries"."boss_id" IS NULL);--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_tickets" CHECK ("wallet_entries"."tickets" >= 0);