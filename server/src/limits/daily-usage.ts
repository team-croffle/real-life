import {
  DAILY_AI_BUTTON_LIMIT_CODE,
  DAILY_AI_BUTTON_MAX,
  DAILY_BOSS_CONFIRM_LIMIT_CODE,
  DAILY_BOSS_CONFIRM_MAX,
  DAILY_QUEST_CREATE_LIMIT_CODE,
  DAILY_QUEST_CREATE_MAX,
} from '@nest-vue/shared';
import { HttpException, HttpStatus } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import type { DrizzleTx } from '../database/database.module';
import { type UserDailyUsageRow, userDailyUsage } from '../database/schema/user-daily-usage';

function dailyLimitException(code: string): HttpException {
  return new HttpException({ message: 'Too many requests', code }, HttpStatus.TOO_MANY_REQUESTS);
}

async function lockDailyUsage(
  tx: DrizzleTx,
  userId: string,
  onDate: string,
): Promise<UserDailyUsageRow> {
  await tx.insert(userDailyUsage).values({ userId, onDate }).onConflictDoNothing();
  const [usageRow] = await tx
    .select()
    .from(userDailyUsage)
    .where(and(eq(userDailyUsage.userId, userId), eq(userDailyUsage.onDate, onDate)))
    .for('update');
  if (!usageRow) {
    throw new Error('user daily usage row is missing');
  }
  return usageRow;
}

export async function consumeQuestCreate(
  tx: DrizzleTx,
  userId: string,
  onDate: string,
): Promise<void> {
  const usageRow = await lockDailyUsage(tx, userId, onDate);
  if (usageRow.questCreates >= DAILY_QUEST_CREATE_MAX) {
    throw dailyLimitException(DAILY_QUEST_CREATE_LIMIT_CODE);
  }
  await tx
    .update(userDailyUsage)
    .set({ questCreates: usageRow.questCreates + 1 })
    .where(and(eq(userDailyUsage.userId, userId), eq(userDailyUsage.onDate, onDate)));
}

export async function consumeBossConfirm(
  tx: DrizzleTx,
  userId: string,
  onDate: string,
): Promise<void> {
  const usageRow = await lockDailyUsage(tx, userId, onDate);
  if (usageRow.bossConfirms >= DAILY_BOSS_CONFIRM_MAX) {
    throw dailyLimitException(DAILY_BOSS_CONFIRM_LIMIT_CODE);
  }
  if (usageRow.questCreates >= DAILY_QUEST_CREATE_MAX) {
    throw dailyLimitException(DAILY_QUEST_CREATE_LIMIT_CODE);
  }
  await tx
    .update(userDailyUsage)
    .set({
      questCreates: usageRow.questCreates + 1,
      bossConfirms: usageRow.bossConfirms + 1,
    })
    .where(and(eq(userDailyUsage.userId, userId), eq(userDailyUsage.onDate, onDate)));
}

/** 하루가 가득이면 429. tryAcquire가 false면 횟수를 안 올리고 false. 자리를 잡으면 true. */
export async function tryConsumeAiButtonCall(
  tx: DrizzleTx,
  userId: string,
  onDate: string,
  tryAcquire: () => boolean,
): Promise<boolean> {
  const usageRow = await lockDailyUsage(tx, userId, onDate);
  if (usageRow.aiButtonCalls >= DAILY_AI_BUTTON_MAX) {
    throw dailyLimitException(DAILY_AI_BUTTON_LIMIT_CODE);
  }
  if (!tryAcquire()) {
    return false;
  }
  await tx
    .update(userDailyUsage)
    .set({ aiButtonCalls: usageRow.aiButtonCalls + 1 })
    .where(and(eq(userDailyUsage.userId, userId), eq(userDailyUsage.onDate, onDate)));
  return true;
}
