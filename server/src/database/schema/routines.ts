import { sql } from 'drizzle-orm';
import { boolean, check, date, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bosses } from './bosses';
import { monsters } from './monsters';
import { questCategoryEnum, questDifficultyEnum, questWeekdayEnum } from './quest-enums';
import { users } from './users';

/** 반복. 예정일마다 quests에 하루짜리 퀘스트를 찍는다. 격주 기준은 created_at이다. */
export const routines = pgTable(
  'routines',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text().notNull(),
    category: questCategoryEnum().notNull(),
    difficulty: questDifficultyEnum().notNull(),
    weekdays: questWeekdayEnum().array().notNull(),
    biweekly: boolean().notNull(),
    active: boolean().notNull().default(true),
    /** 보스 하위 루틴. 보스가 지워지면 루틴도 지운다. */
    bossId: uuid().references(() => bosses.id, { onDelete: 'cascade' }),
    monsterId: uuid().references(() => monsters.id, { onDelete: 'set null' }),
    /** 마지막으로 퀘스트를 찍은 서울 날짜. 아직 없으면 null */
    spawnedOn: date({ mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('routines_user_id_idx').on(table.userId),
    index('routines_boss_id_idx').on(table.bossId),
    index('routines_monster_id_idx').on(table.monsterId),
    check('routines_weekdays', sql`cardinality(${table.weekdays}) >= 1`),
  ],
);

export type RoutineRow = typeof routines.$inferSelect;
export type NewRoutineRow = typeof routines.$inferInsert;
