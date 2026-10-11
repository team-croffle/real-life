import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, unique, uuid } from 'drizzle-orm/pg-core';

import { quests } from './quests';
import { users } from './users';

export const questPenalties = pgTable(
  'quest_penalties',
  {
    id: uuid().primaryKey().defaultRandom(),
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    missedOn: date({ mode: 'string' }).notNull(),
    gold: integer().notNull(),
    xp: integer().notNull(),
  },
  (table) => [
    unique('quest_penalties_quest_id_missed_on_unique').on(table.questId, table.missedOn),
    check('quest_penalties_gold_xp_check', sql`${table.gold} <= 0 AND ${table.xp} <= 0`),
  ],
);

export type QuestPenaltyRow = typeof questPenalties.$inferSelect;
