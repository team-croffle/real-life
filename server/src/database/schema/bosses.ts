import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { quests } from './quests';

/** 메인 퀘스트 한 줄의 체력. 판정 전은 judgedAt이 null이다. */
export const bosses = pgTable(
  'bosses',
  {
    questId: uuid()
      .primaryKey()
      .references(() => quests.id, { onDelete: 'cascade' }),
    maxHp: integer().notNull(),
    hp: integer().notNull(),
    judgedAt: timestamp({ withTimezone: true, mode: 'date' }),
  },
  (table) => [
    check(
      'bosses_hp',
      sql`${table.maxHp} >= 1 AND ${table.hp} >= 0 AND ${table.hp} <= ${table.maxHp}`,
    ),
  ],
);

export type BossRow = typeof bosses.$inferSelect;
export type NewBossRow = typeof bosses.$inferInsert;
