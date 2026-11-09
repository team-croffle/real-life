import { BOSS_RESULTS } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { monsters } from './monsters';
import { questCategoryEnum } from './quest-enums';
import { users } from './users';

export const bossResultEnum = pgEnum('boss_result', BOSS_RESULTS);

/** 보스 한 마리. 퀘스트 행이 아니다. */
export const bosses = pgTable(
  'bosses',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    goal: text().notNull(),
    category: questCategoryEnum().notNull(),
    deadlineOn: date({ mode: 'string' }).notNull(),
    maxHp: integer().notNull(),
    hp: integer().notNull(),
    result: bossResultEnum(),
    judgedAt: timestamp({ withTimezone: true, mode: 'date' }),
    /** 결과 화면을 본 시각. 진행 중이면 비운다. 포기는 판정과 같이 채운다. */
    resultSeenAt: timestamp({ withTimezone: true, mode: 'date' }),
    /** 처치는 받은 경험치, 실패·포기는 실제로 깎은 경험치. 진행 중이면 null. */
    xpChange: integer(),
    monsterId: uuid().references(() => monsters.id, { onDelete: 'set null' }),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('bosses_user_id_idx').on(table.userId),
    index('bosses_monster_id_idx').on(table.monsterId),
    check(
      'bosses_hp',
      sql`${table.maxHp} >= 1 AND ${table.hp} >= 0 AND ${table.hp} <= ${table.maxHp}`,
    ),
    check('bosses_result_judged_at', sql`(${table.result} IS NULL) = (${table.judgedAt} IS NULL)`),
    check(
      'bosses_result_seen_at',
      sql`${table.resultSeenAt} IS NULL OR ${table.result} IS NOT NULL`,
    ),
    check('bosses_result_xp_change', sql`${table.result} IS NOT NULL OR ${table.xpChange} IS NULL`),
  ],
);

export type BossRow = typeof bosses.$inferSelect;
export type NewBossRow = typeof bosses.$inferInsert;
