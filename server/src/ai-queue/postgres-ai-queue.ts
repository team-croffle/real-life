import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, gt, gte, inArray, lt, lte, sql } from 'drizzle-orm';

import type { MonsterDescription } from '../ai/ai';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { aiTasks } from '../database/schema/ai-tasks';
import {
  AI_STALE_RUNNING_MS_DEFAULT,
  AI_TASKS_PER_MINUTE_DEFAULT,
  type AiQueue,
  type ClaimedAiTask,
  type MonsterTaskPayload,
  type MonsterTaskState,
} from './ai-queue';

/** 집기는 최대 3번. 1번 실패 뒤 15초, 2번 실패 뒤 30초, 3번 실패면 끝이다. 한도를 넘기면 60초 뒤다. */
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [15_000, 30_000, 60_000] as const;
const RATE_LIMIT_DELAY_MS = 60_000;
const ERROR_MAX = 500;

@Injectable()
export class PostgresAiQueue implements AiQueue {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
  ) {}

  async enqueue(input: {
    userId: string;
    questId: string;
    payload: MonsterTaskPayload;
  }): Promise<{ id: string }> {
    const payload = monsterPayload(input.payload);
    if (!payload) {
      throw new Error('monster payload is invalid');
    }

    const [aiTaskRow] = await this.db
      .insert(aiTasks)
      .values({
        userId: input.userId,
        questId: input.questId,
        kind: 'monster',
        payload,
      })
      .returning({ id: aiTasks.id });
    if (!aiTaskRow) {
      throw new Error('ai task was not inserted');
    }
    return { id: aiTaskRow.id };
  }

  async findMonsters(questIds: string[]): Promise<MonsterTaskState[]> {
    if (questIds.length === 0) {
      return [];
    }

    return this.db
      .select({
        questId: aiTasks.questId,
        status: aiTasks.status,
        result: aiTasks.result,
      })
      .from(aiTasks)
      .where(and(eq(aiTasks.kind, 'monster'), inArray(aiTasks.questId, questIds)));
  }

  async dequeue(): Promise<ClaimedAiTask | null> {
    return this.db.transaction(async (tx) => {
      // 분당 한도를 세는 동안 다른 프로세스가 같은 수를 보지 않게 한다.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('ai_tasks_dequeue'))`);
      await this.reclaimStale(tx);

      // 상태는 보지 않는다. 실패해도 started_at은 남겨 그 집기를 1분 동안 센다.
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(aiTasks)
        .where(gt(aiTasks.startedAt, sql`now() - interval '1 minute'`));
      if (Number(countRow?.count ?? 0) >= this.perMinute()) {
        return null;
      }

      const [pending] = await tx
        .select({ id: aiTasks.id })
        .from(aiTasks)
        .where(
          and(
            eq(aiTasks.status, 'pending'),
            lte(aiTasks.runAt, sql`now()`),
            eq(aiTasks.kind, 'monster'),
          ),
        )
        .orderBy(asc(aiTasks.runAt), asc(aiTasks.createdAt))
        .limit(1)
        .for('update', { skipLocked: true });
      if (!pending) {
        return null;
      }

      const [claimed] = await tx
        .update(aiTasks)
        .set({
          status: 'running',
          attempts: sql`${aiTasks.attempts} + 1`,
          startedAt: sql`now()`,
          updatedAt: sql`now()`,
        })
        .where(eq(aiTasks.id, pending.id))
        .returning({
          id: aiTasks.id,
          userId: aiTasks.userId,
          attempts: aiTasks.attempts,
          payload: aiTasks.payload,
        });
      return claimed ?? null;
    });
  }

  async complete(id: string, attempts: number, result: MonsterDescription): Promise<void> {
    await this.db
      .update(aiTasks)
      .set({ status: 'succeeded', result, lastError: null, updatedAt: sql`now()` })
      .where(this.sameClaim(id, attempts));
  }

  async fail(id: string, attempts: number, reason: string, rateLimited: boolean): Promise<void> {
    const lastError = reason.slice(0, ERROR_MAX);
    if (attempts >= MAX_ATTEMPTS) {
      await this.db
        .update(aiTasks)
        .set({ status: 'failed', lastError, updatedAt: sql`now()` })
        .where(this.sameClaim(id, attempts));
      return;
    }

    const delayMs = rateLimited ? RATE_LIMIT_DELAY_MS : retryDelayMs(attempts);
    await this.db
      .update(aiTasks)
      .set({
        status: 'pending',
        runAt: new Date(Date.now() + delayMs),
        lastError,
        updatedAt: sql`now()`,
      })
      .where(this.sameClaim(id, attempts));
  }

  private perMinute(): number {
    const raw = this.config.get<string | number>(
      'AI_TASKS_PER_MINUTE',
      AI_TASKS_PER_MINUTE_DEFAULT,
    );
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return AI_TASKS_PER_MINUTE_DEFAULT;
    }
    return parsed;
  }

  /** 집을 때의 시도 횟수가 같은 running만 고친다. 다르면 갱신이 0건이다. */
  private sameClaim(id: string, attempts: number) {
    return and(eq(aiTasks.id, id), eq(aiTasks.status, 'running'), eq(aiTasks.attempts, attempts));
  }

  private staleRunningMs(): number {
    const raw = this.config.get<string | number>(
      'AI_STALE_RUNNING_MS',
      AI_STALE_RUNNING_MS_DEFAULT,
    );
    const parsed = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return AI_STALE_RUNNING_MS_DEFAULT;
    }
    return parsed;
  }

  private async reclaimStale(tx: DrizzleTx): Promise<void> {
    const staleMs = this.staleRunningMs();
    const stale = and(
      eq(aiTasks.status, 'running'),
      lt(aiTasks.startedAt, sql`now() - (${staleMs}::int * interval '1 millisecond')`),
    );
    await tx
      .update(aiTasks)
      .set({ status: 'failed', lastError: 'interrupted', updatedAt: sql`now()` })
      .where(and(stale, gte(aiTasks.attempts, MAX_ATTEMPTS)));
    await tx
      .update(aiTasks)
      .set({
        status: 'pending',
        runAt: sql`now()`,
        lastError: 'interrupted',
        updatedAt: sql`now()`,
      })
      .where(and(stale, lt(aiTasks.attempts, MAX_ATTEMPTS)));
  }
}

/** 1번 실패 뒤 15초, 2번 실패 뒤 30초. 3번이면 다시 넣지 않는다. 60초는 한 단계 더 있을 때의 간격이다. */
function retryDelayMs(attempts: number): number {
  return RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
}

function monsterPayload(value: MonsterTaskPayload): MonsterTaskPayload | null {
  const title = value.title.trim();
  if (!title || title.length > 200) {
    return null;
  }
  const kinds = value.kinds.map((kind) => kind.trim());
  if (kinds.length === 0 || kinds.some((kind) => !kind || kind.length > 200)) {
    return null;
  }
  return { title, kinds };
}
