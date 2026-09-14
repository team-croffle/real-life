import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_KINDS,
  QUEST_SCHEDULES,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const questKindEnum = pgEnum('quest_kind', QUEST_KINDS);
export const questScheduleEnum = pgEnum('quest_schedule', QUEST_SCHEDULES);
export const questCategoryEnum = pgEnum('quest_category', QUEST_CATEGORIES);
export const questDifficultyEnum = pgEnum('quest_difficulty', QUEST_DIFFICULTIES);
export const questWeekdayEnum = pgEnum('quest_weekday', QUEST_WEEKDAYS);

export const quests = pgTable(
  'quests',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: questKindEnum().notNull(),
    category: questCategoryEnum().notNull(),
    title: text().notNull(),
    difficulty: questDifficultyEnum().notNull(),
    schedule: questScheduleEnum().notNull(),
    weekdays: questWeekdayEnum().array(),
    biweekly: boolean(),
    endsOn: date({ mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('quests_user_id_idx').on(table.userId),
    check(
      'quests_schedule_xor',
      sql`(
        (
          ${table.schedule} = 'routine'
          AND ${table.endsOn} IS NULL
          AND ${table.weekdays} IS NOT NULL
          AND cardinality(${table.weekdays}) >= 1
          AND ${table.biweekly} IS NOT NULL
        )
        OR
        (
          ${table.schedule} = 'deadline'
          AND ${table.endsOn} IS NOT NULL
          AND ${table.weekdays} IS NULL
          AND ${table.biweekly} IS NULL
        )
      )`,
    ),
  ],
);

export type QuestRow = typeof quests.$inferSelect;
export type NewQuestRow = typeof quests.$inferInsert;
