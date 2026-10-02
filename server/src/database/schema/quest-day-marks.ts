import { sql } from 'drizzle-orm';
import { date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { quests } from './quests';
import { users } from './users';

export const questDayMarks = pgTable(
  'quest_day_marks',
  {
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    doneOn: date({ mode: 'string' })
      .array()
      .notNull()
      .default(sql`ARRAY[]::date[]`),
    markedDayCount: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.questId, table.userId] })],
);

export type QuestDayMarkRow = typeof questDayMarks.$inferSelect;
