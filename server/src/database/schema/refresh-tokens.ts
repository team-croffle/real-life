import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp({ withTimezone: true, mode: 'date' }),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
