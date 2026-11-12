CREATE TYPE "public"."ai_task_kind" AS ENUM('monster');--> statement-breakpoint
CREATE TYPE "public"."ai_task_status" AS ENUM('pending', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."boss_result" AS ENUM('cleared', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."quest_category" AS ENUM('exercise', 'life', 'study', 'work', 'creation', 'mind');--> statement-breakpoint
CREATE TYPE "public"."quest_difficulty" AS ENUM('easy', 'normal', 'hard');--> statement-breakpoint
CREATE TYPE "public"."quest_pace" AS ENUM('steady', 'once');--> statement-breakpoint
CREATE TYPE "public"."quest_weekday" AS ENUM('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');--> statement-breakpoint
CREATE TYPE "public"."quest_penalty_reason" AS ENUM('missed', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."status_effect" AS ENUM('lethargy');--> statement-breakpoint
CREATE TYPE "public"."shop_kind" AS ENUM('hobby', 'rest', 'food', 'outing', 'shopping');--> statement-breakpoint
CREATE TYPE "public"."job_class" AS ENUM('student', 'office_worker', 'freelancer');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."wallet_entry_kind" AS ENUM('completion', 'post_hoc_deduction', 'penalty', 'employment', 'boss_clear', 'boss_fail', 'boss_abandon', 'purchase');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_provider_account_id_unique" UNIQUE("provider_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "ai_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"quest_id" uuid,
	"routine_id" uuid,
	"boss_id" uuid,
	"kind" "ai_task_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "ai_task_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_tasks_quest_id_unique" UNIQUE("quest_id"),
	CONSTRAINT "ai_tasks_routine_id_unique" UNIQUE("routine_id"),
	CONSTRAINT "ai_tasks_boss_id_unique" UNIQUE("boss_id"),
	CONSTRAINT "ai_tasks_one_owner" CHECK ((
        ("ai_tasks"."quest_id" IS NOT NULL)::int
        + ("ai_tasks"."routine_id" IS NOT NULL)::int
        + ("ai_tasks"."boss_id" IS NOT NULL)::int
      ) = 1)
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_title_length" CHECK (char_length("announcements"."title") >= 1 AND char_length("announcements"."title") <= 100),
	CONSTRAINT "announcements_body_length" CHECK (char_length("announcements"."body") >= 1 AND char_length("announcements"."body") <= 2000)
);
--> statement-breakpoint
CREATE TABLE "bosses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal" text NOT NULL,
	"category" "quest_category" NOT NULL,
	"deadline_on" date NOT NULL,
	"max_hp" integer NOT NULL,
	"hp" integer NOT NULL,
	"result" "boss_result",
	"judged_at" timestamp with time zone,
	"result_seen_at" timestamp with time zone,
	"xp_change" integer,
	"monster_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bosses_hp" CHECK ("bosses"."max_hp" >= 1 AND "bosses"."hp" >= 0 AND "bosses"."hp" <= "bosses"."max_hp"),
	CONSTRAINT "bosses_result_judged_at" CHECK (("bosses"."result" IS NULL) = ("bosses"."judged_at" IS NULL)),
	CONSTRAINT "bosses_result_seen_at" CHECK ("bosses"."result_seen_at" IS NULL OR "bosses"."result" IS NOT NULL),
	CONSTRAINT "bosses_result_xp_change" CHECK ("bosses"."result" IS NOT NULL OR "bosses"."xp_change" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "monsters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monsters_kind" CHECK ("monsters"."kind" in ('slime', 'bat', 'goblin', 'wolf', 'orc', 'skeleton', 'golem', 'dragon', 'minotaur', 'hydra', 'cerberus', 'kraken', 'chimera', 'vampire', 'giant', 'abyss_lord'))
);
--> statement-breakpoint
CREATE TABLE "reward_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"multiplier_tenths" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_events_multiplier_tenths" CHECK ("reward_events"."multiplier_tenths" >= 10 AND "reward_events"."multiplier_tenths" <= 30),
	CONSTRAINT "reward_events_period" CHECK ("reward_events"."ends_at" > "reward_events"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "quest_penalties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quest_id" uuid,
	"quest_title" text NOT NULL,
	"boss_id" uuid,
	"user_id" uuid NOT NULL,
	"missed_on" date NOT NULL,
	"reason" "quest_penalty_reason" NOT NULL,
	"gold" integer NOT NULL,
	"xp" integer NOT NULL,
	CONSTRAINT "quest_penalties_gold_xp_check" CHECK ("quest_penalties"."gold" <= 0 AND "quest_penalties"."xp" <= 0)
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
CREATE TABLE "quests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "quest_category" NOT NULL,
	"title" text NOT NULL,
	"difficulty" "quest_difficulty" NOT NULL,
	"pace" "quest_pace" NOT NULL,
	"ends_on" date NOT NULL,
	"boss_id" uuid,
	"routine_id" uuid,
	"monster_id" uuid,
	"completed_on" date,
	"gold" integer,
	"xp" integer,
	"note" text,
	"battle_log" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quests_routine_id_ends_on_unique" UNIQUE("routine_id","ends_on"),
	CONSTRAINT "quests_completion" CHECK ((
        (
          "quests"."completed_on" IS NULL
          AND "quests"."gold" IS NULL
          AND "quests"."xp" IS NULL
        )
        OR
        (
          "quests"."completed_on" IS NOT NULL
          AND "quests"."gold" IS NOT NULL
          AND "quests"."xp" IS NOT NULL
        )
      ))
);
--> statement-breakpoint
CREATE TABLE "routines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"category" "quest_category" NOT NULL,
	"difficulty" "quest_difficulty" NOT NULL,
	"weekdays" "quest_weekday"[] NOT NULL,
	"biweekly" boolean NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"boss_id" uuid,
	"monster_id" uuid,
	"spawned_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routines_weekdays" CHECK (cardinality("routines"."weekdays") >= 1)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" uuid NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "user_progress" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"gacha_ticket_count" integer DEFAULT 0 NOT NULL,
	"combo_day_count" integer DEFAULT 0 NOT NULL,
	"combo_counted_on" date DEFAULT ((timezone('Asia/Seoul', now()))::date - 1) NOT NULL,
	"status_effect" "status_effect",
	"stamina" integer DEFAULT 0 NOT NULL,
	"intellect" integer DEFAULT 0 NOT NULL,
	"sense" integer DEFAULT 0 NOT NULL,
	"penalties_settled_on" date DEFAULT (timezone('Asia/Seoul', now()))::date NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "user_titles" (
	"user_id" uuid NOT NULL,
	"level_mark" integer NOT NULL,
	CONSTRAINT "user_titles_user_id_level_mark_pk" PRIMARY KEY("user_id","level_mark"),
	CONSTRAINT "user_titles_level_mark_check" CHECK ("user_titles"."level_mark" IN (10, 20, 30, 40, 50))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"nickname" text NOT NULL,
	"tag" text NOT NULL,
	"job_class" "job_class",
	"job_class_changed_at" timestamp with time zone,
	"role" "user_role" DEFAULT 'member' NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"suspended_until" timestamp with time zone,
	"suspend_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_nickname_tag_unique" UNIQUE("nickname","tag"),
	CONSTRAINT "users_suspend_reason_length" CHECK ("users"."suspend_reason" IS NULL OR char_length("users"."suspend_reason") <= 200)
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid()::text NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"tickets" integer DEFAULT 0 NOT NULL,
	"kind" "wallet_entry_kind" NOT NULL,
	"quest_id" uuid,
	"boss_id" uuid,
	"purchased_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallet_entries_one_cause" CHECK ("wallet_entries"."quest_id" IS NULL OR "wallet_entries"."boss_id" IS NULL),
	CONSTRAINT "wallet_entries_tickets" CHECK ("wallet_entries"."tickets" >= 0)
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_day_marks" ADD CONSTRAINT "quest_day_marks_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_day_marks" ADD CONSTRAINT "quest_day_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_usage" ADD CONSTRAINT "user_daily_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_titles" ADD CONSTRAINT "user_titles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_tasks_status_run_at_idx" ON "ai_tasks" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "ai_tasks_user_id_idx" ON "ai_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bosses_user_id_idx" ON "bosses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bosses_monster_id_idx" ON "bosses" USING btree ("monster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quest_penalties_quest_id_missed_on_unique" ON "quest_penalties" USING btree ("quest_id","missed_on") WHERE "quest_penalties"."quest_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "quests_user_id_idx" ON "quests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quests_boss_id_idx" ON "quests" USING btree ("boss_id");--> statement-breakpoint
CREATE INDEX "quests_routine_id_idx" ON "quests" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "quests_monster_id_idx" ON "quests" USING btree ("monster_id");--> statement-breakpoint
CREATE INDEX "routines_user_id_idx" ON "routines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "routines_boss_id_idx" ON "routines" USING btree ("boss_id");--> statement-breakpoint
CREATE INDEX "routines_monster_id_idx" ON "routines" USING btree ("monster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "user_rewards_user_id_idx" ON "user_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_entries_user_id_idx" ON "wallet_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wallet_entries_quest_id_idx" ON "wallet_entries" USING btree ("quest_id");--> statement-breakpoint
CREATE INDEX "wallet_entries_boss_id_idx" ON "wallet_entries" USING btree ("boss_id");