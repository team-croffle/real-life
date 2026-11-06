CREATE TABLE "bosses" (
	"quest_id" uuid PRIMARY KEY NOT NULL,
	"max_hp" integer NOT NULL,
	"hp" integer NOT NULL,
	"judged_at" timestamp with time zone,
	CONSTRAINT "bosses_hp" CHECK ("bosses"."max_hp" >= 1 AND "bosses"."hp" >= 0 AND "bosses"."hp" <= "bosses"."max_hp")
);
--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "boss_quest_id" uuid;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_boss_quest_id_quests_id_fk" FOREIGN KEY ("boss_quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quests_boss_quest_id_idx" ON "quests" USING btree ("boss_quest_id");--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_boss_link" CHECK ((
        ("quests"."kind" = 'main' AND "quests"."boss_quest_id" IS NULL)
        OR "quests"."kind" = 'general'
      ));