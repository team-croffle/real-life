import { STATUS_EFFECTS } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import { date, integer, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const statusEffectEnum = pgEnum('status_effect', STATUS_EFFECTS);

export const userProgress = pgTable('user_progress', {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  level: integer().notNull().default(1),
  xp: integer().notNull().default(0),
  gachaTicketCount: integer().notNull().default(0),
  comboDayCount: integer().notNull().default(0),
  statusEffect: statusEffectEnum(),
  penaltiesSettledOn: date({ mode: 'string' })
    .notNull()
    .default(sql`(timezone('Asia/Seoul', now()))::date`),
  updatedAt: timestamp({ withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserProgressRow = typeof userProgress.$inferSelect;
