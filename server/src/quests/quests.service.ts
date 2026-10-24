import type {
  JobClass,
  Quest,
  QuestDifficulty,
  QuestListItem,
  QuestRoutineRestResult,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_REWARDS,
  QUEST_WEEKDAYS,
  comboRewardMultiplier,
  completionTableAmount,
  grantAmount,
  jobRewardMultiplier,
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
import { and, desc, eq, inArray, sql } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { questCompletions } from '../database/schema/quest-completions';
import { questDayMarks } from '../database/schema/quest-day-marks';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import type { CreateQuestDto } from './dto/create-quest.dto';
import {
  APP_TIME_ZONE,
  calendarDaysBetween,
  isCalendarDate,
  isDeadlineInPeriod,
  isRoutineDueOn,
  rewardPeriodForRemainingDays,
  routineRestAfterPause,
  routineRestAfterResume,
  seoulCalendarDate,
  type RoutineRestDates,
} from './quest-calendar';
import { QuestPenaltyService } from './quest-penalty.service';

const QUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UNSETTLED_PROGRESS_DATE = '0001-01-01';

@Injectable()
export class QuestsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly questPenaltyService: QuestPenaltyService,
  ) {}

  async create(userId: string, dto: CreateQuestDto): Promise<Quest> {
    const title = dto.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }

    if (dto.schedule === 'routine') {
      if (dto.endsOn !== undefined) {
        throw new BadRequestException('routine quests cannot have endsOn');
      }

      const weekdays = uniqueSortedWeekdays(dto.weekdays ?? []);
      if (weekdays.length < 1) {
        throw new BadRequestException('weekdays must contain at least one weekday');
      }

      const questRow = await this.db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(quests)
          .values({
            userId,
            kind: dto.kind,
            category: dto.category,
            title,
            difficulty: dto.difficulty,
            schedule: 'routine',
            weekdays,
            biweekly: dto.biweekly,
            endsOn: null,
          })
          .returning();
        await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
        return inserted;
      });

      return toQuest(requireInserted(questRow), QUEST_REWARDS[dto.difficulty].daily);
    }

    if (dto.weekdays !== undefined || dto.biweekly !== undefined) {
      throw new BadRequestException('deadline quests cannot have weekdays or biweekly');
    }

    const endsOn = dto.endsOn ?? '';
    if (!isCalendarDate(endsOn)) {
      throw new BadRequestException('endsOn must be a calendar date YYYY-MM-DD');
    }

    const remainingDays = calendarDaysBetween(seoulCalendarDate(), endsOn);
    if (remainingDays < QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
      throw new BadRequestException(`endsOn must be today or later in ${APP_TIME_ZONE}`);
    }

    const period = rewardPeriodForRemainingDays(remainingDays);
    const [questRow] = await this.db
      .insert(quests)
      .values({
        userId,
        kind: dto.kind,
        category: dto.category,
        title,
        difficulty: dto.difficulty,
        schedule: 'deadline',
        weekdays: null,
        biweekly: null,
        endsOn,
      })
      .returning();

    return toQuest(requireInserted(questRow), QUEST_REWARDS[dto.difficulty][period]);
  }

  async list(userId: string): Promise<QuestListItem[]> {
    const today = seoulCalendarDate();
    const questRows = await this.db
      .select()
      .from(quests)
      .where(eq(quests.userId, userId))
      .orderBy(desc(quests.createdAt), desc(quests.id));

    if (questRows.length === 0) {
      return [];
    }

    const questIds = questRows.map((questRow) => questRow.id);
    const [userRows, completionRows, markRows, progressRows] = await Promise.all([
      this.db.select({ jobClass: users.jobClass }).from(users).where(eq(users.id, userId)).limit(1),
      this.db
        .select({
          questId: questCompletions.questId,
          completedToday: sql<boolean>`bool_or(${questCompletions.completedOn} = ${today}::date)`,
        })
        .from(questCompletions)
        .where(
          and(eq(questCompletions.userId, userId), inArray(questCompletions.questId, questIds)),
        )
        .groupBy(questCompletions.questId),
      this.db
        .select({
          questId: questDayMarks.questId,
          doneOn: questDayMarks.doneOn,
          markedDayCount: questDayMarks.markedDayCount,
        })
        .from(questDayMarks)
        .where(and(eq(questDayMarks.userId, userId), inArray(questDayMarks.questId, questIds))),
      this.db
        .select({
          comboDayCount: userProgress.comboDayCount,
          comboCountedOn: userProgress.comboCountedOn,
        })
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .limit(1),
    ]);

    const jobClass = userRows[0]?.jobClass;
    if (!jobClass) {
      throw new ForbiddenException();
    }

    const completionByQuest = new Map(
      completionRows.map((row) => [row.questId, { completedToday: row.completedToday === true }]),
    );
    const markByQuest = new Map(markRows.map((row) => [row.questId, row]));
    const progressRow = progressRows[0];
    const countedToday = (progressRow?.comboCountedOn ?? '') >= today;
    const streak = (progressRow?.comboDayCount ?? 0) + (countedToday ? 0 : 1);
    const comboMultiplier = comboRewardMultiplier(streak);

    return questRows.map((questRow) =>
      toQuestListItem(
        questRow,
        today,
        jobClass,
        comboMultiplier,
        completionByQuest.get(questRow.id),
        markByQuest.get(questRow.id),
      ),
    );
  }

  async rest(userId: string, questId: string): Promise<QuestRoutineRestResult> {
    assertQuestId(questId);
    const today = seoulCalendarDate();
    const first = await this.applyPause(userId, questId, today);
    if (first !== 'need-settle') {
      return first;
    }
    await this.questPenaltyService.settle(userId);
    const second = await this.applyPause(userId, questId, today);
    if (second === 'need-settle') {
      throw new InternalServerErrorException('routine rest could not be saved');
    }
    return second;
  }

  async resume(userId: string, questId: string): Promise<QuestRoutineRestResult> {
    assertQuestId(questId);
    const today = seoulCalendarDate();
    return this.db.transaction(async (tx) => {
      const questRow = await lockOwnedQuest(tx, userId, questId);
      if (questRow.schedule !== 'routine') {
        throw new BadRequestException('only routines can resume');
      }
      return saveRest(
        tx,
        questRow,
        routineRestAfterResume(
          { restFrom: questRow.restFrom, restUntil: questRow.restUntil },
          today,
        ),
        today,
      );
    });
  }

  async abandon(userId: string, questId: string): Promise<void> {
    if (!QUEST_ID_PATTERN.test(questId)) {
      throw new NotFoundException();
    }

    await this.db.transaction(async (tx) => {
      const [questRow] = await tx
        .select({ id: quests.id, schedule: quests.schedule })
        .from(quests)
        .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
        .for('update');

      if (!questRow) {
        throw new NotFoundException();
      }

      if (questRow.schedule === 'deadline') {
        const [completionRow] = await tx
          .select({ id: questCompletions.id })
          .from(questCompletions)
          .where(eq(questCompletions.questId, questRow.id))
          .limit(1);

        if (completionRow) {
          throw new ConflictException('completed deadline quests cannot be abandoned');
        }
      }

      await tx.delete(quests).where(eq(quests.id, questRow.id));
    });
  }

  private async applyPause(
    userId: string,
    questId: string,
    today: string,
  ): Promise<QuestRoutineRestResult | 'need-settle'> {
    return this.db.transaction(async (tx) => {
      const questRow = await lockOwnedQuest(tx, userId, questId);
      if (questRow.schedule !== 'routine') {
        throw new BadRequestException('only routines can rest');
      }
      const [progressRow] = await tx
        .select({ penaltiesSettledOn: userProgress.penaltiesSettledOn })
        .from(userProgress)
        .where(eq(userProgress.userId, userId));
      const decision = routineRestAfterPause(
        { restFrom: questRow.restFrom, restUntil: questRow.restUntil },
        today,
        progressRow?.penaltiesSettledOn ?? UNSETTLED_PROGRESS_DATE,
      );
      if (decision.needsSettle) {
        return 'need-settle';
      }
      return saveRest(tx, questRow, decision.rest, today);
    });
  }
}

function requireInserted(questRow: QuestRow | undefined): QuestRow {
  if (!questRow) {
    throw new InternalServerErrorException('quest insert returned no row');
  }
  return questRow;
}

function uniqueSortedWeekdays(weekdays: QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

function toQuestListItem(
  questRow: QuestRow,
  today: string,
  jobClass: JobClass,
  comboMultiplier: number,
  completion: { completedToday: boolean } | undefined,
  mark: { doneOn: string[] | null; markedDayCount: number } | undefined,
): QuestListItem {
  const createdOn = seoulCalendarDate(questRow.createdAt);
  const multiplier = jobRewardMultiplier(jobClass, questRow.category);
  const completed = completion !== undefined;
  const completedToday = completion?.completedToday ?? false;

  if (questRow.schedule === 'routine') {
    const dueToday = isRoutineDueOn(questRow, createdOn, today);
    const payout = rewardPayout(questRow.difficulty, 0, 0, multiplier, comboMultiplier);
    return {
      id: questRow.id,
      kind: questRow.kind,
      category: questRow.category,
      title: questRow.title,
      difficulty: questRow.difficulty,
      schedule: 'routine',
      weekdays: questRow.weekdays ?? [],
      biweekly: questRow.biweekly ?? false,
      endsOn: null,
      restFrom: questRow.restFrom,
      restUntil: questRow.restUntil,
      createdOn,
      dueToday,
      completedToday,
      completed,
      canComplete: dueToday && !completedToday,
      canAbandon: true,
      canMarkToday: false,
      markedDayCount: null,
      markedToday: null,
      elapsedDays: null,
      expectedGold: payout.gold,
      expectedXp: payout.xp,
    };
  }

  const endsOn = questRow.endsOn ?? '';
  const inPeriod = endsOn.length > 0 && isDeadlineInPeriod(createdOn, endsOn, today);
  const daySpan = calendarDaysBetween(createdOn, today);
  const markedDayCount = mark?.markedDayCount ?? 0;
  const markedToday = (mark?.doneOn ?? []).includes(today);
  const canComplete = inPeriod && !completed;
  const payout = canComplete
    ? rewardPayout(
        questRow.difficulty,
        daySpan,
        daySpan > 0 ? markedDayCount : 0,
        multiplier,
        comboMultiplier,
      )
    : null;

  return {
    id: questRow.id,
    kind: questRow.kind,
    category: questRow.category,
    title: questRow.title,
    difficulty: questRow.difficulty,
    schedule: 'deadline',
    weekdays: null,
    biweekly: null,
    endsOn,
    restFrom: null,
    restUntil: null,
    createdOn,
    dueToday: inPeriod,
    completedToday,
    completed,
    canComplete,
    canAbandon: !completed,
    canMarkToday: endsOn !== createdOn && inPeriod && !completed && !markedToday,
    markedDayCount,
    markedToday,
    elapsedDays: inPeriod ? (daySpan <= 0 ? 1 : daySpan + 1) : null,
    expectedGold: payout?.gold ?? null,
    expectedXp: payout?.xp ?? null,
  };
}

function rewardPayout(
  difficulty: QuestDifficulty,
  daySpan: number,
  markedDayCount: number,
  multiplier: number,
  comboMultiplier: number,
): { gold: number; xp: number } {
  const table = completionTableAmount(difficulty, daySpan, markedDayCount);
  return {
    gold: grantAmount(
      table.gold,
      table.markedDays,
      table.elapsedDays,
      multiplier,
      false,
      comboMultiplier,
    ),
    xp: grantAmount(
      table.xp,
      table.markedDays,
      table.elapsedDays,
      multiplier,
      false,
      comboMultiplier,
    ),
  };
}

function toQuest(questRow: QuestRow, reward: { gold: number; xp: number }): Quest {
  const base = {
    id: questRow.id,
    userId: questRow.userId,
    kind: questRow.kind,
    category: questRow.category,
    title: questRow.title,
    difficulty: questRow.difficulty,
    gold: reward.gold,
    xp: reward.xp,
    createdAt: questRow.createdAt.toISOString(),
    updatedAt: questRow.updatedAt.toISOString(),
  };

  if (questRow.schedule === 'routine') {
    return {
      ...base,
      schedule: 'routine',
      weekdays: questRow.weekdays ?? [],
      biweekly: questRow.biweekly ?? false,
      endsOn: null,
      restFrom: questRow.restFrom,
      restUntil: questRow.restUntil,
    };
  }

  return {
    ...base,
    schedule: 'deadline',
    weekdays: null,
    biweekly: null,
    endsOn: questRow.endsOn ?? '',
    restFrom: null,
    restUntil: null,
  };
}

function assertQuestId(questId: string): void {
  if (!QUEST_ID_PATTERN.test(questId)) {
    throw new NotFoundException();
  }
}

async function lockOwnedQuest(tx: DrizzleTx, userId: string, questId: string): Promise<QuestRow> {
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

async function saveRest(
  tx: DrizzleTx,
  questRow: QuestRow,
  rest: RoutineRestDates,
  today: string,
): Promise<QuestRoutineRestResult> {
  const saved =
    questRow.restFrom === rest.restFrom && questRow.restUntil === rest.restUntil
      ? questRow
      : await updateRest(tx, questRow.id, rest);
  return {
    id: saved.id,
    restFrom: saved.restFrom,
    restUntil: saved.restUntil,
    dueToday: isRoutineDueOn(saved, seoulCalendarDate(saved.createdAt), today),
  };
}

async function updateRest(
  tx: DrizzleTx,
  questId: string,
  rest: RoutineRestDates,
): Promise<QuestRow> {
  const [questRow] = await tx.update(quests).set(rest).where(eq(quests.id, questId)).returning();
  return requireInserted(questRow);
}
