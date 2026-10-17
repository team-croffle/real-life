ALTER TABLE "quests" ADD COLUMN "rest_from" date;--> statement-breakpoint
ALTER TABLE "quests" ADD COLUMN "rest_until" date;--> statement-breakpoint
ALTER TABLE "quests" ADD CONSTRAINT "quests_rest_period" CHECK ((
        (
          "quests"."schedule" = 'deadline'
          AND "quests"."rest_from" IS NULL
          AND "quests"."rest_until" IS NULL
        )
        OR
        (
          "quests"."schedule" = 'routine'
          AND (
            ("quests"."rest_from" IS NULL AND "quests"."rest_until" IS NULL)
            OR
            (
              "quests"."rest_from" IS NOT NULL
              AND ("quests"."rest_until" IS NULL OR "quests"."rest_until" >= "quests"."rest_from")
            )
          )
        )
      ));