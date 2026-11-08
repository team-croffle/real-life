import { BOSS_KINDS, MONSTER_KINDS } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const MONSTER_KINDS_SQL = [...MONSTER_KINDS, ...BOSS_KINDS].map((kind) => `'${kind}'`).join(', ');

/** 주인 칸은 없다. 퀘스트·루틴·보스가 monster_id로 가리킨다. */
export const monsters = pgTable(
  'monsters',
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: text().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [check('monsters_kind', sql`${table.kind} in (${sql.raw(MONSTER_KINDS_SQL)})`)],
);

export type MonsterRow = typeof monsters.$inferSelect;
export type NewMonsterRow = typeof monsters.$inferInsert;
