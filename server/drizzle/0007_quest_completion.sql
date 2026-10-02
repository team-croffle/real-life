CREATE TABLE "quest_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"completed_on" date NOT NULL,
	"note" text,
	"gold" integer NOT NULL,
	"xp" integer NOT NULL,
	CONSTRAINT "quest_completions_quest_id_completed_on_unique" UNIQUE("quest_id","completed_on")
);
--> statement-breakpoint
CREATE TABLE "quest_day_marks" (
	"quest_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"done_on" date[] DEFAULT ARRAY[]::date[] NOT NULL,
	"marked_day_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "quest_day_marks_quest_id_user_id_pk" PRIMARY KEY("quest_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"gacha_ticket_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_titles" (
	"user_id" uuid NOT NULL,
	"level_mark" integer NOT NULL,
	CONSTRAINT "user_titles_user_id_level_mark_pk" PRIMARY KEY("user_id","level_mark"),
	CONSTRAINT "user_titles_level_mark_check" CHECK ("user_titles"."level_mark" IN (10, 20, 30, 40, 50))
);
--> statement-breakpoint
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_completions" ADD CONSTRAINT "quest_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_day_marks" ADD CONSTRAINT "quest_day_marks_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_day_marks" ADD CONSTRAINT "quest_day_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;