import {
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

import { quests } from './quests';
import { users } from './users';

export const AI_TASK_KINDS = ['monster'] as const;
export const AI_TASK_STATUSES = ['pending', 'running', 'succeeded', 'failed'] as const;

export type AiTaskKind = (typeof AI_TASK_KINDS)[number];
export type AiTaskStatus = (typeof AI_TASK_STATUSES)[number];

export const aiTaskKindEnum = pgEnum('ai_task_kind', AI_TASK_KINDS);
export const aiTaskStatusEnum = pgEnum('ai_task_status', AI_TASK_STATUSES);

/** 몬스터 생성만 큐에 넣는다. 전투 기록·난이도·계획은 요청 안에서 바로 부른다. */
export const aiTasks = pgTable(
  'ai_tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 몬스터 작업은 퀘스트당 하나. 페이로드에는 넣지 않는다. */
    questId: uuid()
      .notNull()
      .references(() => quests.id, { onDelete: 'cascade' }),
    kind: aiTaskKindEnum().notNull(),
    payload: jsonb().notNull(),
    result: jsonb(),
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
    index('ai_tasks_status_run_at_idx').on(table.status, table.runAt),
    index('ai_tasks_user_id_idx').on(table.userId),
  ],
);

export type AiTaskRow = typeof aiTasks.$inferSelect;
export type NewAiTaskRow = typeof aiTasks.$inferInsert;
