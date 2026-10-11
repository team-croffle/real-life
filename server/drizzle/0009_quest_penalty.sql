CREATE TYPE "public"."wallet_entry_kind" AS ENUM(
  'completion',
  'post_hoc_deduction',
  'penalty',
  'employment'
);
--> statement-breakpoint
CREATE TYPE "public"."status_effect" AS ENUM('lethargy');
--> statement-breakpoint
ALTER TABLE "wallet_entries" ADD COLUMN "kind" "wallet_entry_kind";
--> statement-breakpoint
-- wallet_entries에는 퀘스트나 사유 컬럼이 없다. 취업 축하 골드도 양수라서 기존 행의 완료와 취업 축하를 금액만으로 가를 수 없다. 양수는 completion, 음수는 post_hoc_deduction으로 둔다. 금액이 0이면 kind를 채우지 않아 NOT NULL에서 멈춘다.
UPDATE "wallet_entries" SET "kind" = 'completion' WHERE "amount" > 0;
--> statement-breakpoint
UPDATE "wallet_entries" SET "kind" = 'post_hoc_deduction' WHERE "amount" < 0;
--> statement-breakpoint
ALTER TABLE "wallet_entries" ALTER COLUMN "kind" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "combo_day_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "status_effect" "status_effect";
--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "penalties_settled_on" date DEFAULT (timezone('Asia/Seoul', now()))::date NOT NULL;
--> statement-breakpoint
INSERT INTO "user_progress" ("user_id")
SELECT "id" FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "quest_penalties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quest_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "missed_on" date NOT NULL,
  "gold" integer NOT NULL,
  "xp" integer NOT NULL,
  CONSTRAINT "quest_penalties_quest_id_missed_on_unique" UNIQUE("quest_id","missed_on"),
  CONSTRAINT "quest_penalties_gold_xp_check" CHECK ("gold" <= 0 AND "xp" <= 0)
);
--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_quest_id_quests_id_fk" FOREIGN KEY ("quest_id") REFERENCES "public"."quests"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quest_penalties" ADD CONSTRAINT "quest_penalties_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
