ALTER TABLE "ai_tasks" ADD COLUMN "quest_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_quest_id_unique" UNIQUE("quest_id");