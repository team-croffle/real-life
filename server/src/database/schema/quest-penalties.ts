import { sql } from 'drizzle-orm';
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { bosses } from './bosses';
import { quests } from './quests';
import { users } from './users';

export const QUEST_PENALTY_REASONS = ['missed', 'deleted'] as const;
export type QuestPenaltyReason = (typeof QUEST_PENALTY_REASONS)[number];
export const questPenaltyReasonEnum = pgEnum('quest_penalty_reason', QUEST_PENALTY_REASONS);

export const questPenalties = pgTable(
  'quest_penalties',
  {
    id: uuid().primaryKey().defaultRandom(),
    questId: uuid().references(() => quests.id, { onDelete: 'set null' }),
    questTitle: text().notNull(),
    bossId: uuid().references(() => bosses.id, { onDelete: 'set null' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    missedOn: date({ mode: 'string' }).notNull(),
    reason: questPenaltyReasonEnum().notNull(),
    gold: integer().notNull(),
    xp: integer().notNull(),
  },
  (table) => [
    uniqueIndex('quest_penalties_quest_id_missed_on_unique')
      .on(table.questId, table.missedOn)
      .where(sql`${table.questId} IS NOT NULL`),
    check('quest_penalties_gold_xp_check', sql`${table.gold} <= 0 AND ${table.xp} <= 0`),
  ],
);

export type QuestPenaltyRow = typeof questPenalties.$inferSelect;
