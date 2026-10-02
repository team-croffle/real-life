import { date, integer, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core';

import { quests } from './quests';
import { users } from './users';

export const questCompletions = pgTable(
  'quest_completions',
  {
    id: uuid().primaryKey().defaultRandom(),
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    completedOn: date({ mode: 'string' }).notNull(),
    note: text(),
    gold: integer().notNull(),
    xp: integer().notNull(),
  },
  (table) => [
    unique('quest_completions_quest_id_completed_on_unique').on(table.questId, table.completedOn),
  ],
);

export type QuestCompletionRow = typeof questCompletions.$inferSelect;
