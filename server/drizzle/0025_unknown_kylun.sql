CREATE TABLE "user_daily_usage" (
	"user_id" uuid NOT NULL,
	"on_date" date NOT NULL,
	"quest_creates" integer DEFAULT 0 NOT NULL,
	"boss_confirms" integer DEFAULT 0 NOT NULL,
	"ai_button_calls" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "user_daily_usage_user_id_on_date_pk" PRIMARY KEY("user_id","on_date"),
	CONSTRAINT "user_daily_usage_quest_creates" CHECK ("user_daily_usage"."quest_creates" >= 0),
	CONSTRAINT "user_daily_usage_boss_confirms" CHECK ("user_daily_usage"."boss_confirms" >= 0),
	CONSTRAINT "user_daily_usage_ai_button_calls" CHECK ("user_daily_usage"."ai_button_calls" >= 0)
);
--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD CONSTRAINT "user_daily_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;