import { AUTH_PROVIDERS } from '@nest-vue/shared';
import { pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

/** Login identities (Google now; more AUTH_PROVIDERS later). v1.0 app OAuth tokens/scopes stay off this table. */
export const authProviderEnum = pgEnum('auth_provider', AUTH_PROVIDERS);

export const authIdentities = pgTable(
  'auth_identities',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: authProviderEnum().notNull(),
    subject: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    unique('auth_identities_provider_subject_unique').on(table.provider, table.subject),
    unique('auth_identities_user_provider_unique').on(table.userId, table.provider),
  ],
);
