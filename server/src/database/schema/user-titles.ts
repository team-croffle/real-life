import { sql } from 'drizzle-orm';
import { check, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const userTitles = pgTable(
  'user_titles',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    levelMark: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.levelMark] }),
    check('user_titles_level_mark_check', sql`${table.levelMark} IN (10, 20, 30, 40, 50)`),
  ],
);

export type UserTitleRow = typeof userTitles.$inferSelect;
