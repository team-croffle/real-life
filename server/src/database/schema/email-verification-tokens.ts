import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});
