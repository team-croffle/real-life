import { SHOP_KINDS } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const shopKindEnum = pgEnum('shop_kind', SHOP_KINDS);

export const userRewards = pgTable(
  'user_rewards',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    kind: shopKindEnum().notNull(),
    price: integer().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('user_rewards_user_id_idx').on(table.userId),
    check('user_rewards_price', sql`${table.price} >= 1 AND ${table.price} <= 99999`),
  ],
);

export type UserRewardRow = typeof userRewards.$inferSelect;
export type NewUserRewardRow = typeof userRewards.$inferInsert;
