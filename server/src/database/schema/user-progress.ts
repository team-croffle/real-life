import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const userProgress = pgTable('user_progress', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  level: integer().notNull().default(1),
  xp: integer().notNull().default(0),
  gachaTicketCount: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserProgressRow = typeof userProgress.$inferSelect;
