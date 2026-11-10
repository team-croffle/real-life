import { WALLET_ENTRY_KINDS } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { bosses } from './bosses';
import { quests } from './quests';
import { users } from './users';

export const walletEntryKindEnum = pgEnum('wallet_entry_kind', WALLET_ENTRY_KINDS);

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
    tickets: integer().notNull().default(0),
    kind: walletEntryKindEnum().notNull(),
    /** 이 내역을 만든 퀘스트. 보스 원인이면 비운다. 퀘스트가 지워지면 비워진다. */
    questId: uuid().references(() => quests.id, { onDelete: 'set null' }),
    /** 이 내역을 만든 보스. 퀘스트 원인이면 비운다. 보스가 지워지면 비워진다. */
    bossId: uuid().references(() => bosses.id, { onDelete: 'set null' }),
    /** 구매 당시 보상 이름. 구매가 아니면 비운다. */
    purchasedName: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('wallet_entries_user_id_idx').on(table.userId),
    index('wallet_entries_quest_id_idx').on(table.questId),
    index('wallet_entries_boss_id_idx').on(table.bossId),
    check('wallet_entries_one_cause', sql`${table.questId} IS NULL OR ${table.bossId} IS NULL`),
    check('wallet_entries_tickets', sql`${table.tickets} >= 0`),
  ],
);

export type WalletRow = typeof wallets.$inferSelect;
export type NewWalletRow = typeof wallets.$inferInsert;
export type WalletEntryRow = typeof walletEntries.$inferSelect;
export type NewWalletEntryRow = typeof walletEntries.$inferInsert;
