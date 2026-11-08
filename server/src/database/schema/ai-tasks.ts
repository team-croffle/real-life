import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { bosses } from './bosses';
import { quests } from './quests';
import { routines } from './routines';
import { users } from './users';

export const AI_TASK_KINDS = ['monster'] as const;
export const AI_TASK_STATUSES = ['pending', 'running', 'succeeded', 'failed'] as const;

export type AiTaskKind = (typeof AI_TASK_KINDS)[number];
export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number];

export const aiTaskKindEnum = pgEnum('ai_task_kind', AI_TASK_KINDS);
export const aiTaskStatusEnum = pgEnum('ai_task_status', AI_TASK_STATUSES);

/** 몬스터 생성만 큐에 넣는다. 주인은 퀘스트·루틴·보스 중 하나다. */
export const aiTasks = pgTable(
  'ai_tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questId: uuid().references(() => quests.id, { onDelete: 'cascade' }),
    routineId: uuid().references(() => routines.id, { onDelete: 'cascade' }),
    bossId: uuid().references(() => bosses.id, { onDelete: 'cascade' }),
    kind: aiTaskKindEnum().notNull(),
    payload: jsonb().notNull(),
    status: aiTaskStatusEnum().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    runAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    startedAt: timestamp({ withTimezone: true, mode: 'date' }),
    lastError: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique('ai_tasks_quest_id_unique').on(table.questId),
    unique('ai_tasks_routine_id_unique').on(table.routineId),
    unique('ai_tasks_boss_id_unique').on(table.bossId),
    index('ai_tasks_status_run_at_idx').on(table.status, table.runAt),
    index('ai_tasks_user_id_idx').on(table.userId),
    check(
      'ai_tasks_one_owner',
      sql`(
        (${table.questId} IS NOT NULL)::int
        + (${table.routineId} IS NOT NULL)::int
        + (${table.bossId} IS NOT NULL)::int
      ) = 1`,
    ),
  ],
);

export type AiTaskRow = typeof aiTasks.$inferSelect;
export type NewAiTaskRow = typeof aiTasks.$inferInsert;
