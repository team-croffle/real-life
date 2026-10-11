import type { QuestPenaltyApplied, QuestPenaltySettlement, StatusEffect } from '@nest-vue/shared';
import { QUEST_PENALTIES, appliedXpPenalty } from '@nest-vue/shared';
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gte, lte } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { questCompletions } from '../database/schema/quest-completions';
import { questPenalties } from '../database/schema/quest-penalties';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import { wallets } from '../database/schema/wallets';
import { WalletService } from '../wallet/wallet.service';
import { addCalendarDays, isRoutineDueOn, seoulCalendarDate } from './quest-calendar';

@Injectable()
export class QuestPenaltyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
  ) {}

  async settle(userId: string): Promise<QuestPenaltySettlement> {
    return this.db.transaction(async (tx) => {
      // 완료·직업 변경과 같이 사용자, 지갑, 진행도 순으로 잠근다.
      await lockUser(tx, userId);
      const balance = await lockWalletBalance(tx, userId);
      const progress = await lockProgress(tx, userId);
      const yesterday = addCalendarDays(seoulCalendarDate(), -1);

      if (progress.penaltiesSettledOn >= yesterday) {
        return settlement(progress, balance, []);
      }

      const routineRows = await tx
        .select()
        .from(quests)
        .where(and(eq(quests.userId, userId), eq(quests.schedule, 'routine')));
      const fromDate = addCalendarDays(progress.penaltiesSettledOn, 1);
      const completed = await completedKeys(tx, userId, fromDate, yesterday);
      const penalties: QuestPenaltyApplied[] = [];
      let comboDayCount = progress.comboDayCount;
      let statusEffect = progress.statusEffect;
      let levelXp = progress.xp;
      let nextBalance = balance;

      for (let day = fromDate; day <= yesterday; day = addCalendarDays(day, 1)) {
        const due = routineRows.filter((questRow) =>
          isRoutineDueOn(questRow, seoulCalendarDate(questRow.createdAt), day),
        );
        if (due.length === 0) {
          continue;
        }

        const misses = due
          .filter((questRow) => !completed.has(completionKey(questRow.id, day)))
          .toSorted((left, right) => left.id.localeCompare(right.id));
        if (misses.length === 0) {
          comboDayCount += 1;
          continue;
        }

        comboDayCount = 0;
        statusEffect = 'lethargy';
        // 잔액과 경험치 바닥은 앞 페널티를 반영한 뒤에 계산한다.
        /* oxlint-disable no-await-in-loop */
        for (const questRow of misses) {
          const applied = await this.applyMiss(tx, userId, questRow, day, levelXp);
          levelXp -= applied.xpLoss;
          nextBalance = applied.balance;
          penalties.push({
            questId: questRow.id,
            missedOn: day,
            gold: -applied.goldLoss,
            xp: -applied.xpLoss,
          });
        }
        /* oxlint-enable no-await-in-loop */
      }

      await tx
        .update(userProgress)
        .set({
          xp: levelXp,
          comboDayCount,
          statusEffect,
          penaltiesSettledOn: yesterday,
        })
        .where(eq(userProgress.userId, userId));

      return {
        settledThrough: yesterday,
        comboDayCount,
        statusEffect,
        penalties,
        balance: nextBalance,
        level: progress.level,
        levelXp,
      };
    });
  }

  private async applyMiss(
    tx: DrizzleTx,
    userId: string,
    questRow: QuestRow,
    missedOn: string,
    levelXp: number,
  ): Promise<{ balance: number; goldLoss: number; xpLoss: number }> {
    const table = QUEST_PENALTIES[questRow.difficulty];
    const gold = await this.walletService.applyClampedPenalty(tx, userId, table.gold);
    const xpLoss = appliedXpPenalty(levelXp, table.xp);
    await tx.insert(questPenalties).values({
      questId: questRow.id,
      userId,
      missedOn,
      gold: -gold.applied,
      xp: -xpLoss,
    });
    return { balance: gold.balance, goldLoss: gold.applied, xpLoss };
  }
}

function settlement(
  progress: {
    penaltiesSettledOn: string;
    comboDayCount: number;
    statusEffect: StatusEffect | null;
    level: number;
    xp: number;
  },
  balance: number,
  penalties: QuestPenaltyApplied[],
): QuestPenaltySettlement {
  return {
    settledThrough: progress.penaltiesSettledOn,
    comboDayCount: progress.comboDayCount,
    statusEffect: progress.statusEffect,
    penalties,
    balance,
    level: progress.level,
    levelXp: progress.xp,
  };
}

async function lockUser(tx: DrizzleTx, userId: string): Promise<void> {
  const [userRow] = await tx
    .select({ jobClass: users.jobClass })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');

  if (!userRow) {
    throw new UnauthorizedException();
  }
  if (!userRow.jobClass) {
    throw new ForbiddenException('job class required');
  }
}

async function lockWalletBalance(tx: DrizzleTx, userId: string): Promise<number> {
  await tx.insert(wallets).values({ userId }).onConflictDoNothing();
  const [walletRow] = await tx
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .for('update');

  if (!walletRow) {
    throw new InternalServerErrorException('wallet row missing after insert');
  }
  return walletRow.balance;
}

async function lockProgress(tx: DrizzleTx, userId: string) {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
  const [progressRow] = await tx
    .select({
      level: userProgress.level,
      xp: userProgress.xp,
      comboDayCount: userProgress.comboDayCount,
      statusEffect: userProgress.statusEffect,
      penaltiesSettledOn: userProgress.penaltiesSettledOn,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }
  return progressRow;
}

async function completedKeys(
  tx: DrizzleTx,
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const completionRows = await tx
    .select({
      questId: questCompletions.questId,
      completedOn: questCompletions.completedOn,
    })
    .from(questCompletions)
    .where(
      and(
        eq(questCompletions.userId, userId),
        gte(questCompletions.completedOn, fromDate),
        lte(questCompletions.completedOn, toDate),
      ),
    );

  return new Set(completionRows.map((row) => completionKey(row.questId, row.completedOn)));
}

function completionKey(questId: string, completedOn: string): string {
  return `${questId}:${completedOn}`;
}
