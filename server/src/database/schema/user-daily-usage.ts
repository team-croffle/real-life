import { sql } from 'drizzle-orm';
import { check, date, integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const userDailyUsage = pgTable(
  'user_daily_usage',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    onDate: date({ mode: 'string' }).notNull(),
    questCreates: integer().notNull().default(0),
    bossConfirms: integer().notNull().default(0),
    aiButtonCalls: integer().notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.onDate] }),
    check('user_daily_usage_quest_creates', sql`${table.questCreates} >= 0`),
    check('user_daily_usage_boss_confirms', sql`${table.bossConfirms} >= 0`),
    check('user_daily_usage_ai_button_calls', sql`${table.aiButtonCalls} >= 0`),
  ],
);

export type UserDailyUsageRow = typeof userDailyUsage.$inferSelect;
