import type {
  JobClass,
  Paginated,
  Quest,
  QuestDifficulty,
  QuestListItem,
  QuestPace,
} from '@nest-vue/shared';
import {
  MONSTER_IMAGE_KEYS,
  MONSTER_KINDS,
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_PENALTIES,
  QUEST_REWARDS,
  appliedGoldPenalty,
  appliedXpPenalty,
  comboRewardMultiplier,
  completionTableAmount,
  deadlinePenaltyAmount,
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
  UnauthorizedException,
} from '@nestjs/common';
import { and, count, desc, eq, gte, inArray } from 'drizzle-orm';

import { RewardEventsService } from '../admin/reward-events.service';
import { AI_QUEUE, type AiQueue, type MonsterTaskState } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import { monsters } from '../database/schema/monsters';
import { questDayMarks } from '../database/schema/quest-day-marks';
import { questPenalties } from '../database/schema/quest-penalties';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import { wallets } from '../database/schema/wallets';
import { consumeQuestCreate } from '../limits/daily-usage';
import { WalletService } from '../wallet/wallet.service';
import { BossJudgmentService } from './boss-judgment.service';
import type { CreateQuestDto } from './dto/create-quest.dto';
import { HISTORY_DEFAULT_PAGE_SIZE, type ListHistoryQueryDto } from './dto/list-history-query.dto';
import { monsterView } from './monster-view';
import {
  APP_TIME_ZONE,
  appCalendarDate,
  calendarDaysBetween,
  isCalendarDate,
  isDeadlineInPeriod,
  rewardPeriodForRemainingDays,
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
    private readonly walletService: WalletService,
    private readonly questPenaltyService: QuestPenaltyService,
    private readonly bossJudgmentService: BossJudgmentService,
    private readonly routineSpawnService: RoutineSpawnService,
    private readonly rewardEvents: RewardEventsService,
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

    const remainingDays = calendarDaysBetween(appCalendarDate(), endsOn);
    if (remainingDays < QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
      throw new BadRequestException(`endsOn must be today or later in ${APP_TIME_ZONE}`);
    }

    const pace = dto.pace ?? 'steady';
    const period = rewardPeriodForRemainingDays(remainingDays);
    const reward =
      pace === 'once' ? QUEST_REWARDS[dto.difficulty].daily : QUEST_REWARDS[dto.difficulty][period];
    const inserted = await this.db.transaction(async (tx) => {
      await consumeQuestCreate(tx, userId, appCalendarDate());
      const [questRow] = await tx
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
      return requireInserted(questRow);
    });
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

  /** 정산(판정 포함) → 판정된 보스 하위 루틴 정리 → 오늘 찍기. 다시 해도 결과가 같다. */
  async prepareForRead(userId: string): Promise<void> {
    await this.questPenaltyService.settle(userId);
    await this.bossJudgmentService.clearJudgedSubroutines(userId);
    await this.routineSpawnService.spawnToday(userId);
  }

  async list(userId: string): Promise<QuestListItem[]> {
    await this.prepareForRead(userId);

    const today = appCalendarDate();
    const questRows = await this.db
      .select()
      .from(quests)
      .where(and(eq(quests.userId, userId), gte(quests.endsOn, today)))
      .orderBy(desc(quests.createdAt), desc(quests.id));

    return this.toListItems(userId, questRows, today);
  }

  async history(userId: string, query: ListHistoryQueryDto): Promise<Paginated<QuestListItem>> {
    await this.prepareForRead(userId);

    const page = query.page ?? 1;
    const size = query.size ?? HISTORY_DEFAULT_PAGE_SIZE;
    const where = eq(quests.userId, userId);
    const [countRow] = await this.db.select({ total: count() }).from(quests).where(where);
    const total = Number(countRow?.total ?? 0);
    const totalPages = Math.ceil(total / size);
    if (page > Math.max(totalPages, 1)) {
      throw new BadRequestException('page is out of range');
    }

    const questRows = await this.db
      .select()
      .from(quests)
      .where(where)
      .orderBy(desc(quests.createdAt), desc(quests.id))
      .limit(size)
      .offset((page - 1) * size);
    const today = appCalendarDate();
    return {
      items: await this.toListItems(userId, questRows, today),
      page,
      size,
      total,
      totalPages,
    };
  }

  private async toListItems(
    userId: string,
    questRows: QuestRow[],
    today: string,
  ): Promise<QuestListItem[]> {
    if (questRows.length === 0) {
      return [];
    }

    const questIds = questRows.map((questRow) => questRow.id);
    const monsterIds = questRows.flatMap((questRow) =>
      questRow.monsterId ? [questRow.monsterId] : [],
    );
    const bossIds = questRows.flatMap((questRow) => (questRow.bossId ? [questRow.bossId] : []));
    const routineIds = questRows.flatMap((questRow) =>
      questRow.routineId ? [questRow.routineId] : [],
    );
    const [userRows, markRows, progressRows, walletRows, monsterRows, bossRows, monsterTasks] =
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
            xp: userProgress.xp,
          })
          .from(userProgress)
          .where(eq(userProgress.userId, userId))
          .limit(1),
        this.db
          .select({ balance: wallets.balance })
          .from(wallets)
          .where(eq(wallets.userId, userId))
          .limit(1),
        monsterIds.length === 0
          ? Promise.resolve([])
          : this.db.select().from(monsters).where(inArray(monsters.id, monsterIds)),
        bossIds.length === 0
          ? Promise.resolve([])
          : this.db
              .select({ id: bosses.id, goal: bosses.goal, bossName: monsters.name })
              .from(bosses)
              .leftJoin(monsters, eq(bosses.monsterId, monsters.id))
              .where(inArray(bosses.id, bossIds)),
        this.queue.findTasks({
          questIds,
          ...(routineIds.length > 0 ? { routineIds } : {}),
        }),
      ]);

    const jobClass = userRows[0]?.jobClass;
    if (!jobClass) {
      throw new ForbiddenException();
    }

    const markByQuest = new Map(markRows.map((row) => [row.questId, row]));
    const monsterById = new Map(monsterRows.map((row) => [row.id, row]));
    const goalByBoss = new Map(bossRows.map((row) => [row.id, row.goal]));
    const nameByBoss = new Map(bossRows.map((row) => [row.id, row.bossName]));
    const taskByQuest = new Map(
      monsterTasks.flatMap((task) => (task.questId ? [[task.questId, task] as const] : [])),
    );
    const taskByRoutine = new Map(
      monsterTasks.flatMap((task) => (task.routineId ? [[task.routineId, task] as const] : [])),
    );
    const progressRow = progressRows[0];
    const countedToday = (progressRow?.comboCountedOn ?? '') >= today;
    const streak = (progressRow?.comboDayCount ?? 0) + (countedToday ? 0 : 1);
    const comboMultiplier = comboRewardMultiplier(streak);
    const eventMultiplier = await this.rewardEvents.activeMultiplier();
    const levelXp = progressRow?.xp ?? 0;
    const balance = walletRows[0]?.balance ?? 0;

    return questRows.map((questRow) =>
      toQuestListItem(
        questRow,
        today,
        jobClass,
        comboMultiplier,
        eventMultiplier,
        markByQuest.get(questRow.id),
        questRow.monsterId ? monsterById.get(questRow.monsterId) : undefined,
        taskByQuest.get(questRow.id),
        questRow.routineId ? taskByRoutine.get(questRow.routineId) : undefined,
        questRow.bossId,
        questRow.bossId ? (goalByBoss.get(questRow.bossId) ?? null) : null,
        questRow.bossId ? (nameByBoss.get(questRow.bossId) ?? null) : null,
        balance,
        levelXp,
      ),
    );
  }

  async abandon(userId: string, questId: string): Promise<void> {
    if (!QUEST_ID_PATTERN.test(questId)) {
      throw new NotFoundException();
    }

    await this.db.transaction(async (tx) => {
      // 완료가 퀘스트 행을 사용자보다 먼저 잠근다. 삭제도 그 순서라 둘이 서로 기다리지 않는다.
      const questRow = await lockQuest(tx, userId, questId);
      await lockUser(tx, userId);
      await lockWallet(tx, userId);
      const levelXp = await lockProgressXp(tx, userId);
      const today = appCalendarDate();
      if (questRow.completedOn !== null || questRow.endsOn < today) {
        throw new ConflictException('completed or past-due quests cannot be abandoned');
      }

      const markedToday = await lockedMarkedToday(tx, userId, questRow.id, today);
      if (!isFreeAbandon(questRow, today, markedToday)) {
        const table = penaltySameAsMiss(questRow);
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
          missedOn: today,
          reason: 'deleted',
          gold: -gold.applied,
          xp: -xpLoss,
        });
        if (xpLoss > 0) {
          await tx
            .update(userProgress)
            .set({ xp: levelXp - xpLoss })
            .where(eq(userProgress.userId, userId));
        }
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
  eventMultiplier: number,
  mark: { doneOn: string[] | null; markedDayCount: number } | undefined,
  monster: { kind: string; name: string; description: string } | undefined,
  monsterTask: MonsterTaskState | undefined,
  routineTask: MonsterTaskState | undefined,
  bossId: string | null,
  bossTitle: string | null,
  bossName: string | null,
  balance: number,
  levelXp: number,
): QuestListItem {
  const createdOn = appCalendarDate(questRow.createdAt);
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
  const canAbandon = !completed && endsOn >= today;
  const charge =
    canAbandon && !isFreeAbandon(questRow, today, markedToday) ? penaltySameAsMiss(questRow) : null;
  const payout = canComplete
    ? rewardPayout(
        questRow.difficulty,
        daySpan,
        daySpan > 0 ? markedDayCount : 0,
        multiplier,
        comboMultiplier,
        pace,
        eventMultiplier,
      )
    : null;
  const ownAppearance = monsterView(
    monster,
    monsterTask?.status,
    isMonsterKind,
    (kind) => MONSTER_IMAGE_KEYS[kind],
  );
  const appearance =
    questRow.routineId !== null && ownAppearance.monsterStatus !== 'ready'
      ? monsterView(
          undefined,
          routineTask?.status,
          isMonsterKind,
          (kind) => MONSTER_IMAGE_KEYS[kind],
        )
      : ownAppearance;

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
    canAbandon,
    abandonGold: charge ? appliedGoldPenalty(balance, charge.gold) : 0,
    abandonXp: charge ? appliedXpPenalty(levelXp, charge.xp) : 0,
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
    bossName,
  };
}

export function rewardPayout(
  difficulty: QuestDifficulty,
  daySpan: number,
  markedDayCount: number,
  multiplier: number,
  comboMultiplier: number,
  pace: QuestPace,
  eventMultiplier = 1,
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
      1,
      eventMultiplier,
    ),
    xp: grantAmount(
      table.xp,
      table.markedDays,
      table.elapsedDays,
      multiplier,
      false,
      comboMultiplier,
      1,
      eventMultiplier,
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

function isFreeAbandon(questRow: QuestRow, today: string, markedToday: boolean): boolean {
  return (
    appCalendarDate(questRow.createdAt) === today &&
    !markedToday &&
    questRow.routineId === null &&
    questRow.bossId === null
  );
}

/** 루틴이 찍은 퀘스트는 일일 패널티, 그 외는 만든 날부터 마감일까지의 기한 패널티다. */
function penaltySameAsMiss(questRow: QuestRow): { gold: number; xp: number } {
  if (questRow.routineId !== null) {
    return QUEST_PENALTIES[questRow.difficulty];
  }
  return deadlinePenaltyAmount(
    questRow.difficulty,
    calendarDaysBetween(appCalendarDate(questRow.createdAt), questRow.endsOn),
    questRow.pace,
  );
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

async function lockWallet(tx: DrizzleTx, userId: string): Promise<void> {
  await tx.insert(wallets).values({ userId }).onConflictDoNothing();
  const [walletRow] = await tx
    .select({ balance: wallets.balance })
    .from(wallets)
    .where(eq(wallets.userId, userId))
    .for('update');

  if (!walletRow) {
    throw new InternalServerErrorException('wallet row missing after insert');
  }
}

async function lockProgressXp(tx: DrizzleTx, userId: string): Promise<number> {
  await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
  const [progressRow] = await tx
    .select({ xp: userProgress.xp })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .for('update');

  if (!progressRow) {
    throw new InternalServerErrorException('progress row missing after insert');
  }
  return progressRow.xp;
}

async function lockedMarkedToday(
  tx: DrizzleTx,
  userId: string,
  questId: string,
  today: string,
): Promise<boolean> {
  const [markRow] = await tx
    .select({ doneOn: questDayMarks.doneOn })
    .from(questDayMarks)
    .where(and(eq(questDayMarks.questId, questId), eq(questDayMarks.userId, userId)))
    .for('update');

  return (markRow?.doneOn ?? []).includes(today);
}
