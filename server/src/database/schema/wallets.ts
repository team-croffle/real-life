import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const wallets = pgTable('wallets', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  balance: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const walletEntries = pgTable(
  'wallet_entries',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    amount: integer().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [index('wallet_entries_user_id_idx').on(table.userId)],
);

export type WalletRow = typeof wallets.$inferSelect;
export type NewWalletRow = typeof wallets.$inferInsert;
export type WalletEntryRow = typeof walletEntries.$inferSelect;
export type NewWalletEntryRow = typeof walletEntries.$inferInsert;
