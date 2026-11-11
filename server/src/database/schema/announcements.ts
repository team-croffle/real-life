import { sql } from 'drizzle-orm';
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const announcements = pgTable(
  'announcements',
  {
    id: uuid().primaryKey().defaultRandom(),
    title: text().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      'announcements_title_length',
      sql`char_length(${table.title}) >= 1 AND char_length(${table.title}) <= 100`,
    ),
    check(
      'announcements_body_length',
      sql`char_length(${table.body}) >= 1 AND char_length(${table.body}) <= 2000`,
    ),
  ],
);

export type AnnouncementRow = typeof announcements.$inferSelect;
export type NewAnnouncementRow = typeof announcements.$inferInsert;
