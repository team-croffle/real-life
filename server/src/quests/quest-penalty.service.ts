import type { QuestPenaltyApplied, QuestPenaltySettlement, StatusEffect } from '@nest-vue/shared';
import { QUEST_PENALTIES, appliedXpPenalty, deadlinePenaltyAmount } from '@nest-vue/shared';
import {
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { and, eq, gte, isNotNull, isNull, lte } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { questPenalties } from '../database/schema/quest-penalties';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import { wallets } from '../database/schema/wallets';
import { WalletService } from '../wallet/wallet.service';
import { BossJudgmentService } from './boss-judgment.service';
import { addCalendarDays, calendarDaysBetween, seoulCalendarDate } from './quest-calendar';

@Injectable()
export class QuestPenaltyService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
    private readonly bossJudgmentService: BossJudgmentService,
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

      const fromDate = addCalendarDays(progress.penaltiesSettledOn, 1);
      const completedDays = await completedOnDays(tx, userId, fromDate, yesterday);
      const openRows = await tx
        .select()
        .from(quests)
        .where(
          and(
            eq(quests.userId, userId),
            isNull(quests.completedOn),
            gte(quests.endsOn, fromDate),
            lte(quests.endsOn, yesterday),
          ),
        );
      const penalties: QuestPenaltyApplied[] = [];
      let comboDayCount = progress.comboDayCount;
      let statusEffect = progress.statusEffect;
      let levelXp = progress.xp;
      let nextBalance = balance;

      for (let day = fromDate; day <= yesterday; day = addCalendarDays(day, 1)) {
        const misses = openRows
          .filter((questRow) => questRow.endsOn === day)
          .toSorted((left, right) => left.id.localeCompare(right.id));
        if (misses.length > 0) {
          statusEffect = 'lethargy';
        }

        const targets = misses.map((questRow) => ({
          questRow,
          table:
            questRow.routineId !== null
              ? QUEST_PENALTIES[questRow.difficulty]
              : deadlinePenaltyAmount(
                  questRow.difficulty,
                  calendarDaysBetween(seoulCalendarDate(questRow.createdAt), day),
                  questRow.pace,
                ),
        }));
        // 잔액과 경험치 바닥은 앞 페널티를 반영한 뒤에 계산한다.
        /* oxlint-disable no-await-in-loop */
        for (const { questRow, table } of targets) {
          const applied = await this.applyMiss(tx, userId, questRow, day, levelXp, table);
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

        // 연속 +1은 그날 첫 완료가 한다. 정산은 완료가 없는 날만 0으로 만든다.
        if (!completedDays.has(day)) {
          comboDayCount = 0;
        }
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

      const judged = await this.bossJudgmentService.judgeDue(tx, userId, yesterday);

      return {
        settledThrough: yesterday,
        comboDayCount,
        statusEffect,
        penalties,
        balance: judged?.balance ?? nextBalance,
        level: judged?.level ?? progress.level,
        levelXp: judged?.levelXp ?? levelXp,
      };
    });
  }

  private async applyMiss(
    tx: DrizzleTx,
    userId: string,
    questRow: QuestRow,
    missedOn: string,
    levelXp: number,
    table: { gold: number; xp: number },
  ): Promise<{ balance: number; goldLoss: number; xpLoss: number }> {
    const gold = await this.walletService.applyClampedPenalty(tx, userId, table.gold, {
      questId: questRow.id,
      bossId: null,
    });
    const xpLoss = appliedXpPenalty(levelXp, table.xp);
    await tx.insert(questPenalties).values({
      questId: questRow.id,
      questTitle: questRow.title,
      bossId: questRow.bossId,
      userId,
      missedOn,
      reason: 'missed',
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

async function completedOnDays(
  tx: DrizzleTx,
  userId: string,
  fromDate: string,
  toDate: string,
): Promise<Set<string>> {
  const completionRows = await tx
    .select({ completedOn: quests.completedOn })
    .from(quests)
    .where(
      and(
        eq(quests.userId, userId),
        isNotNull(quests.completedOn),
        gte(quests.completedOn, fromDate),
        lte(quests.completedOn, toDate),
      ),
    );

  return new Set(completionRows.flatMap((row) => (row.completedOn ? [row.completedOn] : [])));
}
