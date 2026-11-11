import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const rewardEvents = pgTable(
  'reward_events',
  {
    id: uuid().primaryKey().defaultRandom(),
    multiplierTenths: integer().notNull(),
    startsAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    endsAt: timestamp({ withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      'reward_events_multiplier_tenths',
      sql`${table.multiplierTenths} >= 10 AND ${table.multiplierTenths} <= 30`,
    ),
    check('reward_events_period', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export type RewardEventRow = typeof rewardEvents.$inferSelect;
export type NewRewardEventRow = typeof rewardEvents.$inferInsert;
