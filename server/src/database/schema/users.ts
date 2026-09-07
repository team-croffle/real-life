import { JOB_CLASSES, USER_ROLES } from '@nest-vue/shared';
import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', USER_ROLES);
export const jobClassEnum = pgEnum('job_class', JOB_CLASSES);

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull().unique(),
    passwordHash: text(),
    nickname: text().notNull(),
    tag: text().notNull(),
    jobClass: jobClassEnum().notNull(),
    role: userRoleEnum().notNull().default('member'),
    emailVerifiedAt: timestamp({ withTimezone: true, mode: 'date' }),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique('users_nickname_tag_unique').on(table.nickname, table.tag)],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
