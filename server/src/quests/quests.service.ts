import type { JobClass, Quest, QuestDifficulty, QuestListItem, QuestPace } from '@nest-vue/shared';
import {
  MONSTER_IMAGE_KEYS,
  MONSTER_KINDS,
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_REWARDS,
  comboRewardMultiplier,
  completionTableAmount,
  grantAmount,
  isMonsterKind,
  jobRewardMultiplier,
} from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { AI_QUEUE, type AiQueue, type MonsterTaskState } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import { monsters } from '../database/schema/monsters';
import { questDayMarks } from '../database/schema/quest-day-marks';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import type { CreateQuestDto } from './dto/create-quest.dto';
import { monsterView } from './monster-view';
import {
  APP_TIME_ZONE,
  calendarDaysBetween,
  isCalendarDate,
  isDeadlineInPeriod,
  rewardPeriodForRemainingDays,
  seoulCalendarDate,
} from './quest-calendar';
import { QuestPenaltyService } from './quest-penalty.service';
import { RoutineSpawnService } from './routine-spawn.service';

const QUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
    private readonly questPenaltyService: QuestPenaltyService,
    private readonly routineSpawnService: RoutineSpawnService,
  ) {}

  async create(userId: string, dto: CreateQuestDto): Promise<Quest> {
    const title = dto.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }

    const endsOn = dto.endsOn;
    if (!isCalendarDate(endsOn)) {
      throw new BadRequestException('endsOn must be a calendar date YYYY-MM-DD');
    }

    const remainingDays = calendarDaysBetween(seoulCalendarDate(), endsOn);
    if (remainingDays < QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
      throw new BadRequestException(`endsOn must be today or later in ${APP_TIME_ZONE}`);
    }

    const pace = dto.pace ?? 'steady';
    const period = rewardPeriodForRemainingDays(remainingDays);
    const reward =
      pace === 'once' ? QUEST_REWARDS[dto.difficulty].daily : QUEST_REWARDS[dto.difficulty][period];
    const [questRow] = await this.db
      .insert(quests)
      .values({
        userId,
        category: dto.category,
        title,
        difficulty: dto.difficulty,
        pace,
        endsOn,
      })
      .returning();

    const inserted = requireInserted(questRow);
    await this.enqueueMonster(userId, inserted.id, title);
    return toQuest(inserted, reward);
  }

  /** 큐에 넣지 못해도 등록 응답은 그대로 둔다. */
  private async enqueueMonster(userId: string, questId: string, title: string): Promise<void> {
    try {
      await this.queue.enqueue({
        userId,
        owner: { questId },
        payload: { title, kinds: [...MONSTER_KINDS] },
      });
    } catch (error) {
      this.logger.error(
        `monster enqueue failed for quest ${questId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async list(userId: string): Promise<QuestListItem[]> {
    await this.questPenaltyService.settle(userId);
    await this.routineSpawnService.spawnToday(userId);

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
    const monsterIds = questRows.flatMap((questRow) =>
      questRow.monsterId ? [questRow.monsterId] : [],
    );
    const bossIds = questRows.flatMap((questRow) => (questRow.bossId ? [questRow.bossId] : []));
    const [userRows, markRows, progressRows, monsterRows, bossRows, monsterTasks] =
      await Promise.all([
        this.db
          .select({ jobClass: users.jobClass })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1),
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
        monsterIds.length === 0
          ? Promise.resolve([])
          : this.db.select().from(monsters).where(inArray(monsters.id, monsterIds)),
        bossIds.length === 0
          ? Promise.resolve([])
          : this.db
              .select({ id: bosses.id, goal: bosses.goal })
              .from(bosses)
              .where(inArray(bosses.id, bossIds)),
        this.queue.findTasks({ questIds }),
      ]);

    const jobClass = userRows[0]?.jobClass;
    if (!jobClass) {
      throw new ForbiddenException();
    }

    const markByQuest = new Map(markRows.map((row) => [row.questId, row]));
    const monsterById = new Map(monsterRows.map((row) => [row.id, row]));
    const goalByBoss = new Map(bossRows.map((row) => [row.id, row.goal]));
    const taskByQuest = new Map(
      monsterTasks.flatMap((task) => (task.questId ? [[task.questId, task] as const] : [])),
    );
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
        markByQuest.get(questRow.id),
        questRow.monsterId ? monsterById.get(questRow.monsterId) : undefined,
        taskByQuest.get(questRow.id),
        questRow.bossId,
        questRow.bossId ? (goalByBoss.get(questRow.bossId) ?? null) : null,
      ),
    );
  }

  async abandon(userId: string, questId: string): Promise<void> {
    if (!QUEST_ID_PATTERN.test(questId)) {
      throw new NotFoundException();
    }

    await this.db.transaction(async (tx) => {
      const [questRow] = await tx
        .select({ id: quests.id, completedOn: quests.completedOn })
        .from(quests)
        .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
        .for('update');

      if (!questRow) {
        throw new NotFoundException();
      }
      if (questRow.completedOn !== null) {
        throw new ConflictException('completed deadline quests cannot be abandoned');
      }

      await tx.delete(quests).where(eq(quests.id, questRow.id));
    });
  }
}

function requireInserted(questRow: QuestRow | undefined): QuestRow {
  if (!questRow) {
    throw new InternalServerErrorException('quest insert returned no row');
  }
  return questRow;
}

function toQuestListItem(
  questRow: QuestRow,
  today: string,
  jobClass: JobClass,
  comboMultiplier: number,
  mark: { doneOn: string[] | null; markedDayCount: number } | undefined,
  monster: { kind: string; name: string; description: string } | undefined,
  monsterTask: MonsterTaskState | undefined,
  bossId: string | null,
  bossTitle: string | null,
): QuestListItem {
  const createdOn = seoulCalendarDate(questRow.createdAt);
  const multiplier = jobRewardMultiplier(jobClass, questRow.category);
  const completed = questRow.completedOn !== null;
  const completedToday = questRow.completedOn === today;
  const endsOn = questRow.endsOn;
  const pace = questRow.pace;
  const inPeriod = isDeadlineInPeriod(createdOn, endsOn, today);
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
        pace,
      )
    : null;
  const appearance = monsterView(
    monster,
    monsterTask?.status,
    isMonsterKind,
    (kind) => MONSTER_IMAGE_KEYS[kind],
  );

  return {
    id: questRow.id,
    category: questRow.category,
    title: questRow.title,
    difficulty: questRow.difficulty,
    pace,
    endsOn,
    createdOn,
    routineId: questRow.routineId,
    dueToday: inPeriod,
    completedToday,
    completed,
    canComplete,
    canAbandon: !completed,
    canMarkToday: pace !== 'once' && endsOn !== createdOn && inPeriod && !completed && !markedToday,
    markedDayCount,
    markedToday,
    elapsedDays: inPeriod ? (daySpan <= 0 ? 1 : daySpan + 1) : null,
    expectedGold: payout?.gold ?? null,
    expectedXp: payout?.xp ?? null,
    monsterStatus: appearance.monsterStatus,
    monster: appearance.monster,
    bossId,
    bossTitle,
  };
}

function rewardPayout(
  difficulty: QuestDifficulty,
  daySpan: number,
  markedDayCount: number,
  multiplier: number,
  comboMultiplier: number,
  pace: QuestPace,
): { gold: number; xp: number } {
  const table = completionTableAmount(difficulty, daySpan, markedDayCount, pace);
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

export function toQuest(questRow: QuestRow, reward: { gold: number; xp: number }): Quest {
  return {
    id: questRow.id,
    userId: questRow.userId,
    category: questRow.category,
    title: questRow.title,
    difficulty: questRow.difficulty,
    pace: questRow.pace,
    endsOn: questRow.endsOn,
    gold: reward.gold,
    xp: reward.xp,
    bossId: questRow.bossId,
    routineId: questRow.routineId,
    createdAt: questRow.createdAt.toISOString(),
    updatedAt: questRow.updatedAt.toISOString(),
  };
}
