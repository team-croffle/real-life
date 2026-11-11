import { JOB_CLASSES, USER_ROLES } from '@nest-vue/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const jobClassEnum = pgEnum('job_class', JOB_CLASSES);

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    nickname: text().notNull(),
    tag: text().notNull(),
    jobClass: jobClassEnum(),
    jobClassChangedAt: timestamp({ withTimezone: true, mode: 'date' }),
    role: userRoleEnum().notNull().default('member'),
    suspended: boolean().notNull().default(false),
    suspendedUntil: timestamp({ withTimezone: true, mode: 'date' }),
    suspendReason: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('users_nickname_tag_unique').on(table.nickname, table.tag),
    check(
      'users_suspend_reason_length',
      sql`${table.suspendReason} IS NULL OR char_length(${table.suspendReason}) <= 200`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
