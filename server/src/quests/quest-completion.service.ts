import type { QuestCompletionResult, QuestDayMarkResult } from '@nest-vue/shared';
import {
  QUEST_NOTE_MAX_LENGTH,
  applyLevelXp,
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
import { WalletService } from '../wallet/wallet.service';
import type { CompleteQuestDto } from './dto/complete-quest.dto';
import {
  calendarDaysBetween,
  isBiweeklyOnWeek,
  seoulCalendarDate,
  weekdayOfCalendarDate,
} from './quest-calendar';

const QUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class QuestCompletionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly walletService: WalletService,
  ) {}

  async complete(
    userId: string,
    questId: string,
    dto: CompleteQuestDto,
  ): Promise<QuestCompletionResult> {
    assertQuestId(questId);
    const note = normalizeNote(dto.note);

    return this.db.transaction(async (tx) => {
      const questRow = await lockQuest(tx, userId, questId);
      const today = seoulCalendarDate();
      const createdOn = seoulCalendarDate(questRow.createdAt);
      await assertCompletable(tx, questRow, createdOn, today);

      const daySpan = questRow.schedule === 'deadline' ? calendarDaysBetween(createdOn, today) : 0;
      const markedDayCount = daySpan > 0 ? await lockedMarkCount(tx, questRow.id, userId) : 0;
      const table = completionTableAmount(questRow.difficulty, daySpan, markedDayCount);
      const multiplier = jobRewardMultiplier(await requireJobClass(tx, userId), questRow.category);
      const noteBonus = note !== null;
      const gold = grantAmount(
        table.gold,
        table.markedDays,
        table.elapsedDays,
        multiplier,
        noteBonus,
      );
      const xp = grantAmount(table.xp, table.markedDays, table.elapsedDays, multiplier, noteBonus);

      const balance = await this.walletService.applyBalanceDelta(tx, userId, gold);
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
      if (today < createdOn || today > questRow.endsOn) {
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

async function requireJobClass(tx: DrizzleTx, userId: string) {
  const [userRow] = await tx
    .select({ jobClass: users.jobClass })
    .from(users)
    .where(eq(users.id, userId));

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
    const weekdays = questRow.weekdays ?? [];
    if (!weekdays.includes(weekdayOfCalendarDate(today))) {
      throw new BadRequestException('today is not a scheduled weekday');
    }
    if (questRow.biweekly && !isBiweeklyOnWeek(createdOn, today)) {
      throw new BadRequestException('today is an off week');
    }
    if (await hasCompletionOn(tx, questRow.id, today)) {
      throw new ConflictException('quest is already completed for this day');
    }
    return;
  }

  if (questRow.endsOn === null || today > questRow.endsOn) {
    throw new BadRequestException('quest is past its end date');
  }
  if (await hasAnyCompletion(tx, questRow.id)) {
    throw new ConflictException('quest is already completed');
  }
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

  if (applied.titlesGranted.length > 0) {
    await tx
      .insert(userTitles)
      .values(applied.titlesGranted.map((levelMark) => ({ userId, levelMark })))
      .onConflictDoNothing();
  }

  return {
    level: applied.level,
    levelXp: applied.levelXp,
    ticketsGranted: applied.ticketsGranted,
    titlesGranted: applied.titlesGranted,
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
