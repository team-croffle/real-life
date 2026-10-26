import type { QuestCompletionResult, QuestDayMarkResult, StatusEffect } from '@nest-vue/shared';
import {
  QUEST_NOTE_MAX_LENGTH,
  applyLevelXp,
  comboRewardMultiplier,
  completionTableAmount,
  grantAmount,
  jobRewardMultiplier,
  xpRequiredToLevelUp,
} from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { questCompletions } from '../database/schema/quest-completions';
import { questDayMarks } from '../database/schema/quest-day-marks';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { userTitles } from '../database/schema/user-titles';
import { users } from '../database/schema/users';
import { wallets } from '../database/schema/wallets';
import { WalletService } from '../wallet/wallet.service';
import type { CompleteQuestDto } from './dto/complete-quest.dto';
import {
  calendarDaysBetween,
  isDeadlineInPeriod,
  isRestingOn,
  isRoutineDueOn,
  seoulCalendarDate,
  weekdayOfCalendarDate,
} from './quest-calendar';
import { QuestCritRoller } from './quest-crit.roller';
import { QuestPenaltyService } from './quest-penalty.service';

const QUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class QuestCompletionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
    private readonly questPenaltyService: QuestPenaltyService,
    private readonly questCritRoller: QuestCritRoller,
  ) {}

  async complete(
    userId: string,
    questId: string,
    dto: CompleteQuestDto,
  ): Promise<QuestCompletionResult> {
    assertQuestId(questId);
    const note = normalizeNote(dto.note);
    await this.questPenaltyService.settle(userId);

    return this.db.transaction(async (tx) => {
      const questRow = await lockQuest(tx, userId, questId);
      const today = seoulCalendarDate();
      const createdOn = seoulCalendarDate(questRow.createdAt);
      await assertCompletable(tx, questRow, createdOn, today);

      const daySpan = questRow.schedule === 'deadline' ? calendarDaysBetween(createdOn, today) : 0;
      const markedDayCount = daySpan > 0 ? await lockedMarkCount(tx, questRow.id, userId) : 0;
      const table = completionTableAmount(questRow.difficulty, daySpan, markedDayCount);
      // 직업 변경은 users, 지갑, 진행도 순으로 잠근다. 오늘 첫 완료인지는 그 잠금 뒤에서만 본다.
      const jobClass = await requireJobClass(tx, userId);
      const balanceBefore = await lockWallet(tx, userId);
      const combo = await advanceComboOnFirstCompletion(tx, userId, today);
      const multiplier = jobRewardMultiplier(jobClass, questRow.category);
      const comboMultiplier = comboRewardMultiplier(combo.comboDayCount);
      const noteBonus = note !== null;
      // 외상(잔액이 음수)일 때는 크리티컬을 굴리지 않는다.
      const critMultiplier = balanceBefore < 0 ? 1 : this.questCritRoller.roll();
      const gold = grantAmount(
        table.gold,
        table.markedDays,
        table.elapsedDays,
        multiplier,
        noteBonus,
        comboMultiplier,
        critMultiplier,
      );
      const xp = grantAmount(
        table.xp,
        table.markedDays,
        table.elapsedDays,
        multiplier,
        noteBonus,
        comboMultiplier,
      );

      const balance = await this.walletService.applyBalanceDelta(tx, userId, gold, 'completion');
      const progress = await grantProgress(tx, userId, xp);

      try {
        await tx.insert(questCompletions).values({
          questId: questRow.id,
          userId,
          completedOn: today,
          note,
          gold,
          xp,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ConflictException('quest is already completed for this day');
        }
        throw error;
      }

      const statusEffect = await statusAfterCompletion(tx, userId, questRow.schedule === 'routine');

      return {
        gold,
        xp,
        balance,
        level: progress.level,
        levelXp: progress.levelXp,
        xpToNext: xpRequiredToLevelUp(progress.level),
        ticketsGranted: progress.ticketsGranted,
        ticketCount: progress.ticketCount,
        titlesGranted: progress.titlesGranted,
        statusEffect,
        applied: {
          baseGold: table.gold,
          baseXp: table.xp,
          markedDays: table.markedDays,
          elapsedDays: table.elapsedDays,
          jobMultiplier: multiplier,
          comboMultiplier,
          noteBonus,
          critMultiplier,
        },
      };
    });
  }

  async markToday(userId: string, questId: string): Promise<QuestDayMarkResult> {
    assertQuestId(questId);

    return this.db.transaction(async (tx) => {
      const questRow = await lockQuest(tx, userId, questId);
      const today = seoulCalendarDate();
      if (questRow.schedule !== 'deadline' || questRow.endsOn === null) {
        throw new BadRequestException('only weekly and long quests can mark a day');
      }

      const createdOn = seoulCalendarDate(questRow.createdAt);
      if (questRow.endsOn === createdOn) {
        throw new BadRequestException('only weekly and long quests can mark a day');
      }
      if (!isDeadlineInPeriod(createdOn, questRow.endsOn, today)) {
        throw new BadRequestException('today is outside the quest period');
      }
      if (await hasAnyCompletion(tx, questRow.id)) {
        throw new ConflictException('completed quests cannot mark a day');
      }

      await tx
        .insert(questDayMarks)
        .values({
          questId: questRow.id,
          userId,
          doneOn: [today],
          markedDayCount: 1,
        })
        .onConflictDoUpdate({
          target: [questDayMarks.questId, questDayMarks.userId],
          set: {
            doneOn: sql`${questDayMarks.doneOn} || ARRAY[${today}]::date[]`,
            markedDayCount: sql`${questDayMarks.markedDayCount} + 1`,
          },
          where: sql`NOT (${questDayMarks.doneOn} @> ARRAY[${today}]::date[])`,
        });

      const [markRow] = await tx
        .select({
          doneOn: questDayMarks.doneOn,
          markedDayCount: questDayMarks.markedDayCount,
        })
        .from(questDayMarks)
        .where(and(eq(questDayMarks.questId, questRow.id), eq(questDayMarks.userId, userId)));

      if (!markRow) {
        throw new InternalServerErrorException('day mark row missing after insert');
      }

      return {
        doneOn: markRow.doneOn ?? [],
        markedDayCount: markRow.markedDayCount,
      };
    });
  }
}

function assertQuestId(questId: string): void {
  if (!QUEST_ID_PATTERN.test(questId)) {
    throw new NotFoundException();
  }
}

function normalizeNote(note: string | undefined): string | null {
  const trimmed = note?.trim() ?? '';
  if (trimmed.length > QUEST_NOTE_MAX_LENGTH) {
    throw new BadRequestException('note must be at most 500 characters');
  }
  return trimmed.length > 0 ? trimmed : null;
}

async function lockQuest(tx: DrizzleTx, userId: string, questId: string): Promise<QuestRow> {
  const [questRow] = await tx
    .select()
    .from(quests)
    .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
    .for('update');

  if (!questRow) {
    throw new NotFoundException();
  }
  return questRow;
}

async function lockWallet(tx: DrizzleTx, userId: string): Promise<number> {
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

async function advanceComboOnFirstCompletion(
  tx: DrizzleTx,
  userId: string,
  today: string,
): Promise<{ comboDayCount: number }> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
  const [progressRow] = await tx
    .select({
      comboDayCount: userProgress.comboDayCount,
      comboCountedOn: userProgress.comboCountedOn,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }
  if (progressRow.comboCountedOn >= today) {
    return { comboDayCount: progressRow.comboDayCount };
  }

  const comboDayCount = progressRow.comboDayCount + 1;
  await tx
    .update(userProgress)
    .set({ comboDayCount, comboCountedOn: today })
    .where(eq(userProgress.userId, userId));
  return { comboDayCount };
}

async function requireJobClass(tx: DrizzleTx, userId: string) {
  const [userRow] = await tx
    .select({ jobClass: users.jobClass })
    .from(users)
    .where(eq(users.id, userId))
    .for('update');

  if (!userRow?.jobClass) {
    throw new ForbiddenException();
  }
  return userRow.jobClass;
}

async function assertCompletable(
  tx: DrizzleTx,
  questRow: QuestRow,
  createdOn: string,
  today: string,
): Promise<void> {
  if (today < createdOn) {
    throw new BadRequestException('quest cannot be completed before it was created');
  }

  if (questRow.schedule === 'routine') {
    if (isRestingOn(questRow, today)) {
      throw new BadRequestException('routine is resting today');
    }
    if (!isRoutineDueOn(questRow, createdOn, today)) {
      const weekdays = questRow.weekdays ?? [];
      if (!weekdays.includes(weekdayOfCalendarDate(today))) {
        throw new BadRequestException('today is not a scheduled weekday');
      }
      throw new BadRequestException('today is an off week');
    }
    if (await hasCompletionOn(tx, questRow.id, today)) {
      throw new ConflictException('quest is already completed for this day');
    }
    return;
  }

  if (questRow.endsOn === null || !isDeadlineInPeriod(createdOn, questRow.endsOn, today)) {
    throw new BadRequestException('quest is past its end date');
  }
  if (await hasAnyCompletion(tx, questRow.id)) {
    throw new ConflictException('quest is already completed');
  }
}

async function statusAfterCompletion(
  tx: DrizzleTx,
  userId: string,
  clearLethargy: boolean,
): Promise<StatusEffect | null> {
  if (clearLethargy) {
    await tx
      .update(userProgress)
      .set({ statusEffect: null })
      .where(eq(userProgress.userId, userId));
    return null;
  }

  const [progressRow] = await tx
    .select({ statusEffect: userProgress.statusEffect })
    .from(userProgress)
    .where(eq(userProgress.userId, userId));
  return progressRow?.statusEffect ?? null;
}

async function hasCompletionOn(
  tx: DrizzleTx,
  questId: string,
  completedOn: string,
): Promise<boolean> {
  const [completionRow] = await tx
    .select({ id: questCompletions.id })
    .from(questCompletions)
    .where(
      and(eq(questCompletions.questId, questId), eq(questCompletions.completedOn, completedOn)),
    );
  return completionRow !== undefined;
}

async function hasAnyCompletion(tx: DrizzleTx, questId: string): Promise<boolean> {
  const [completionRow] = await tx
    .select({ id: questCompletions.id })
    .from(questCompletions)
    .where(eq(questCompletions.questId, questId))
    .limit(1);
  return completionRow !== undefined;
}

async function lockedMarkCount(tx: DrizzleTx, questId: string, userId: string): Promise<number> {
  const [markRow] = await tx
    .select({ markedDayCount: questDayMarks.markedDayCount })
    .from(questDayMarks)
    .where(and(eq(questDayMarks.questId, questId), eq(questDayMarks.userId, userId)))
    .for('update');
  return markRow?.markedDayCount ?? 0;
}

async function grantProgress(
  tx: DrizzleTx,
  userId: string,
  gainedXp: number,
): Promise<{
  level: number;
  levelXp: number;
  ticketsGranted: number;
  titlesGranted: number[];
  ticketCount: number;
}> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();

  const [progressRow] = await tx
    .select({
      level: userProgress.level,
      xp: userProgress.xp,
      gachaTicketCount: userProgress.gachaTicketCount,
    })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }

  const applied = applyLevelXp(progressRow.level, progressRow.xp, gainedXp);
  const ticketCount = progressRow.gachaTicketCount + applied.ticketsGranted;

  await tx
    .update(userProgress)
    .set({
      level: applied.level,
      xp: applied.levelXp,
      gachaTicketCount: ticketCount,
    })
    .where(eq(userProgress.userId, userId));

  let titlesGranted: number[] = [];
  if (applied.titlesGranted.length > 0) {
    const inserted = await tx
      .insert(userTitles)
      .values(applied.titlesGranted.map((levelMark) => ({ userId, levelMark })))
      .onConflictDoNothing()
      .returning({ levelMark: userTitles.levelMark });
    titlesGranted = inserted.map((row) => row.levelMark).toSorted((left, right) => left - right);
  }

  return {
    level: applied.level,
    levelXp: applied.levelXp,
    ticketsGranted: applied.ticketsGranted,
    titlesGranted,
    ticketCount,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  if ('code' in error && error.code === '23505') {
    return true;
  }
  return 'cause' in error && isUniqueViolation(error.cause);
}
