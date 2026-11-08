TRUNCATE TABLE "quests", "quest_completions", "quest_day_marks", "quest_penalties", "bosses", "ai_tasks" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."quest_penalty_reason" AS ENUM('missed', 'deleted');--> statement-breakpoint
CREATE TABLE "monsters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monsters_kind" CHECK ("monsters"."kind" in ('slime', 'bat', 'goblin', 'wolf', 'orc', 'skeleton', 'golem', 'dragon', 'minotaur', 'hydra', 'cerberus', 'kraken', 'chimera', 'vampire', 'giant', 'abyss_lord'))
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "routines_weekdays" CHECK (cardinality("routines"."weekdays") >= 1)
);
--> statement-breakpoint
ALTER TABLE "quest_completions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "quest_completions" CASCADE;--> statement-breakpoint
ALTER TABLE "quest_penalties" DROP CONSTRAINT "quest_penalties_quest_id_missed_on_unique";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_boss_link";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_schedule_xor";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_pace";--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_rest_period";--> statement-breakpoint
ALTER TABLE "bosses" DROP CONSTRAINT "bosses_quest_id_quests_id_fk";
--> statement-breakpoint
ALTER TABLE "quest_penalties" DROP CONSTRAINT "quest_penalties_quest_id_quests_id_fk";
--> statement-breakpoint
ALTER TABLE "quests" DROP CONSTRAINT "quests_boss_quest_id_quests_id_fk";
--> statement-breakpoint
DROP INDEX "quests_boss_quest_id_idx";--> statement-breakpoint
ALTER TABLE "ai_tasks" ALTER COLUMN "quest_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_penalties" ALTER COLUMN "quest_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "pace" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ALTER COLUMN "ends_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" DROP CONSTRAINT "bosses_pkey";--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_pkey" PRIMARY KEY ("id");--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "goal" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "category" "quest_category" NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "deadline_on" date NOT NULL;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "monster_id" uuid;--> statement-breakpoint
ALTER TABLE "bosses" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "routine_id" uuid;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD COLUMN "boss_id" uuid;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD COLUMN "quest_title" text NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD COLUMN "boss_id" uuid;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD COLUMN "reason" "quest_penalty_reason" NOT NULL;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "boss_id" uuid;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "routine_id" uuid;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "monster_id" uuid;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "completed_on" date;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "gold" integer;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "xp" integer;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "battle_log" text;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "stamina" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "intellect" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "sense" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routines" ADD CONSTRAINT "routines_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routines_user_id_idx" ON "routines" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "routines_boss_id_idx" ON "routines" USING btree ("boss_id");--> statement-breakpoint
CREATE INDEX "routines_monster_id_idx" ON "routines" USING btree ("monster_id");--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bosses" ADD CONSTRAINT "bosses_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_boss_id_bosses_id_fk" FOREIGN KEY ("boss_id") REFERENCES "public"."bosses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_monster_id_monsters_id_fk" FOREIGN KEY ("monster_id") REFERENCES "public"."monsters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bosses_user_id_idx" ON "bosses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bosses_monster_id_idx" ON "bosses" USING btree ("monster_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quest_penalties_quest_id_missed_on_unique" ON "quest_penalties" USING btree ("quest_id","missed_on") WHERE "quest_penalties"."quest_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "quests_boss_id_idx" ON "quests" USING btree ("boss_id");--> statement-breakpoint
CREATE INDEX "quests_routine_id_idx" ON "quests" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "quests_monster_id_idx" ON "quests" USING btree ("monster_id");--> statement-breakpoint
ALTER TABLE "bosses" DROP COLUMN "quest_id";--> statement-breakpoint
ALTER TABLE "ai_tasks" DROP COLUMN "result";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "kind";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "schedule";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "weekdays";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "biweekly";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "boss_quest_id";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "rest_from";--> statement-breakpoint
ALTER TABLE "quests" DROP COLUMN "rest_until";--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_routine_id_unique" UNIQUE("routine_id");--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_boss_id_unique" UNIQUE("boss_id");--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_routine_id_ends_on_unique" UNIQUE("routine_id","ends_on");--> statement-breakpoint
ALTER TABLE "ai_tasks" ADD CONSTRAINT "ai_tasks_one_owner" CHECK ((
        ("ai_tasks"."quest_id" IS NOT NULL)::int
        + ("ai_tasks"."routine_id" IS NOT NULL)::int
        + ("ai_tasks"."boss_id" IS NOT NULL)::int
      ) = 1);--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_completion" CHECK ((
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
      ));--> statement-breakpoint
DROP TYPE "public"."quest_kind";--> statement-breakpoint
DROP TYPE "public"."quest_schedule";