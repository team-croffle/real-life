import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { bosses } from './bosses';
import { monsters } from './monsters';
import { questCategoryEnum, questDifficultyEnum, questPaceEnum } from './quest-enums';
import { routines } from './routines';
import { users } from './users';

/** 할 일 하나. 루틴이 찍은 행은 pace once, ends_on은 그날이다. */
export const quests = pgTable(
  'quests',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: questCategoryEnum().notNull(),
    title: text().notNull(),
    difficulty: questDifficultyEnum().notNull(),
    pace: questPaceEnum().notNull(),
    endsOn: date({ mode: 'string' }).notNull(),
    bossId: uuid().references(() => bosses.id, { onDelete: 'set null' }),
    routineId: uuid().references(() => routines.id, { onDelete: 'set null' }),
    monsterId: uuid().references(() => monsters.id, { onDelete: 'set null' }),
    completedOn: date({ mode: 'string' }),
    gold: integer(),
    xp: integer(),
    note: text(),
    battleLog: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('quests_user_id_idx').on(table.userId),
    index('quests_boss_id_idx').on(table.bossId),
    index('quests_routine_id_idx').on(table.routineId),
    index('quests_monster_id_idx').on(table.monsterId),
    unique('quests_routine_id_ends_on_unique').on(table.routineId, table.endsOn),
    check(
      'quests_completion',
      sql`(
        (
          ${table.completedOn} IS NULL
          AND ${table.gold} IS NULL
          AND ${table.xp} IS NULL
        )
        OR
        (
          ${table.completedOn} IS NOT NULL
          AND ${table.gold} IS NOT NULL
          AND ${table.xp} IS NOT NULL
        )
      )`,
    ),
  ],
);

export type QuestRow = typeof quests.$inferSelect;
export type NewQuestRow = typeof quests.$inferInsert;
