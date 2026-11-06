import { randomUUID } from 'node:crypto';

import type {
  BossAppearance,
  BossSummary,
  ConfirmedBoss,
  MonsterStatus,
  Quest,
  QuestDifficulty,
  QuestPace,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  BOSS_ACTIVE_MAX,
  BOSS_IMAGE_KEYS,
  BOSS_KINDS,
  MONSTER_KINDS,
  QUEST_REWARDS,
  QUEST_WEEKDAYS,
  bossQuestHp,
  isBossKind,
} from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { AI_QUEUE, type AiQueue, type MonsterTaskState } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import type { BossRow } from '../database/schema/bosses';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import type { ConfirmBossDto, ConfirmBossQuestDto } from './dto/confirm-boss.dto';
import {
  APP_TIME_ZONE,
  calendarDaysBetween,
  isCalendarDate,
  rewardPeriodForRemainingDays,
  routineOccurrenceCount,
  seoulCalendarDate,
} from './quest-calendar';

/** 보스 행의 난이도 열. 체력은 하위 퀘스트로만 계산한다. */
const BOSS_ROW_DIFFICULTY = 'normal';

type PlannedSubquest =
  | {
      schedule: 'routine';
      title: string;
      category: ConfirmBossQuestDto['category'];
      difficulty: QuestDifficulty;
      weekdays: QuestWeekday[];
      biweekly: boolean;
      times: number;
      hp: number;
    }
  | {
      schedule: 'deadline';
      title: string;
      category: ConfirmBossQuestDto['category'];
      difficulty: QuestDifficulty;
      pace: QuestPace;
      endsOn: string;
      times: number;
      hp: number;
    };

@Injectable()
export class BossPlanService {
  private readonly logger = new Logger(BossPlanService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
  ) {}

  async confirm(userId: string, dto: ConfirmBossDto): Promise<ConfirmedBoss> {
    const title = dto.goal.trim();
    if (title.length < 1) {
      throw new BadRequestException('goal must not be empty');
    }
    if (!isCalendarDate(dto.deadlineOn)) {
      throw new BadRequestException('deadlineOn must be a calendar date YYYY-MM-DD');
    }

    const created = await this.db.transaction(async (tx) => {
      await lockUser(tx, userId);
      const today = seoulCalendarDate();
      if (calendarDaysBetween(today, dto.deadlineOn) < 0) {
        throw new BadRequestException(`deadlineOn must be today or later in ${APP_TIME_ZONE}`);
      }
      const active = await countActiveBosses(tx, userId);
      if (active >= BOSS_ACTIVE_MAX) {
        throw new ConflictException('three bosses are already in progress');
      }

      const planned = planSubquests(dto.quests, today, dto.deadlineOn);
      const maxHp = planned.reduce((sum, item) => sum + item.hp, 0);
      if (maxHp < 1) {
        throw new BadRequestException('boss hp must be at least 1');
      }

      await tx.insert(userProgress).values({ userId }).onConflictDoNothing();
      const [bossQuest] = await tx
        .insert(quests)
        .values({
          userId,
          kind: 'main',
          category: dto.category,
          title,
          difficulty: BOSS_ROW_DIFFICULTY,
          schedule: 'deadline',
          pace: 'once',
          weekdays: null,
          biweekly: null,
          endsOn: dto.deadlineOn,
          bossQuestId: null,
        })
        .returning();
      const bossRow = requireInserted(bossQuest);
      await tx.insert(bosses).values({ questId: bossRow.id, maxHp, hp: maxHp });

      const subquestValues = planned.map((item) => ({
        id: randomUUID(),
        userId,
        kind: 'general' as const,
        category: item.category,
        title: item.title,
        difficulty: item.difficulty,
        schedule: item.schedule,
        pace: item.schedule === 'deadline' ? item.pace : null,
        weekdays: item.schedule === 'routine' ? item.weekdays : null,
        biweekly: item.schedule === 'routine' ? item.biweekly : null,
        endsOn: item.schedule === 'deadline' ? item.endsOn : null,
        bossQuestId: bossRow.id,
      }));
      const insertedSubquests = await tx.insert(quests).values(subquestValues).returning();
      const subquestById = new Map(insertedSubquests.map((questRow) => [questRow.id, questRow]));
      const subquestRows = subquestValues.map((value) =>
        requireInserted(subquestById.get(value.id)),
      );

      return { bossRow, subquestRows, maxHp, today };
    });

    await this.enqueueAll(userId, title, created.bossRow.id, created.subquestRows);
    return {
      id: created.bossRow.id,
      category: created.bossRow.category,
      title: created.bossRow.title,
      endsOn: created.bossRow.endsOn ?? dto.deadlineOn,
      maxHp: created.maxHp,
      hp: created.maxHp,
      quests: created.subquestRows.map((questRow) => toQuest(questRow, created.today)),
    };
  }

  async list(userId: string): Promise<BossSummary[]> {
    const rows = await this.db
      .select({ questRow: quests, bossRow: bosses })
      .from(bosses)
      .innerJoin(quests, eq(bosses.questId, quests.id))
      .where(and(eq(quests.userId, userId), isNull(bosses.judgedAt)))
      .orderBy(desc(quests.createdAt), desc(quests.id));

    if (rows.length === 0) {
      return [];
    }

    const tasks = await this.queue.findMonsters(
      rows.map((bossAndQuest) => bossAndQuest.questRow.id),
    );
    const taskByQuest = new Map(tasks.map((task) => [task.questId, task]));
    return rows.map((bossAndQuest) =>
      toBossSummary(
        bossAndQuest.questRow,
        bossAndQuest.bossRow,
        taskByQuest.get(bossAndQuest.questRow.id),
      ),
    );
  }

  /** 큐에 넣지 못해도 확정은 그대로 둔다. */
  private async enqueueAll(
    userId: string,
    goal: string,
    bossQuestId: string,
    subquestRows: QuestRow[],
  ): Promise<void> {
    await Promise.all([
      this.enqueue(userId, bossQuestId, goal, [...BOSS_KINDS]),
      ...subquestRows.map((questRow) =>
        this.enqueue(userId, questRow.id, questRow.title, [...MONSTER_KINDS]),
      ),
    ]);
  }

  private async enqueue(
    userId: string,
    questId: string,
    title: string,
    kinds: string[],
  ): Promise<void> {
    try {
      await this.queue.enqueue({ userId, questId, payload: { title, kinds } });
    } catch (error) {
      this.logger.error(
        `monster enqueue failed for quest ${questId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

function planSubquests(
  items: ConfirmBossQuestDto[],
  today: string,
  deadlineOn: string,
): PlannedSubquest[] {
  return items.map((item) => {
    const title = item.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }

    if (item.schedule === 'routine') {
      if (item.endsOn !== undefined) {
        throw new BadRequestException('routine quests cannot have endsOn');
      }
      if (item.pace !== undefined) {
        throw new BadRequestException('routine quests cannot have pace');
      }
      const weekdays = uniqueSortedWeekdays(item.weekdays ?? []);
      if (weekdays.length < 1) {
        throw new BadRequestException('weekdays must contain at least one weekday');
      }
      if (item.biweekly === undefined) {
        throw new BadRequestException('routine quests require biweekly');
      }
      const times = routineOccurrenceCount(
        { weekdays, biweekly: item.biweekly },
        today,
        deadlineOn,
      );
      if (times < 1) {
        throw new BadRequestException('a routine has no days before the boss deadline');
      }
      return {
        schedule: 'routine',
        title,
        category: item.category,
        difficulty: item.difficulty,
        weekdays,
        biweekly: item.biweekly,
        times,
        hp: bossQuestHp(times, item.difficulty),
      };
    }

    if (item.weekdays !== undefined || item.biweekly !== undefined) {
      throw new BadRequestException('deadline quests cannot have weekdays or biweekly');
    }
    const endsOn = item.endsOn ?? '';
    if (!isCalendarDate(endsOn)) {
      throw new BadRequestException('endsOn must be a calendar date YYYY-MM-DD');
    }
    if (calendarDaysBetween(today, endsOn) < 0) {
      throw new BadRequestException(`endsOn must be today or later in ${APP_TIME_ZONE}`);
    }
    if (endsOn > deadlineOn) {
      throw new BadRequestException('a subquest deadline is after the boss deadline');
    }
    if (item.pace === undefined) {
      throw new BadRequestException('deadline quests require pace');
    }
    return {
      schedule: 'deadline',
      title,
      category: item.category,
      difficulty: item.difficulty,
      pace: item.pace,
      endsOn,
      times: 1,
      hp: bossQuestHp(1, item.difficulty),
    };
  });
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

async function countActiveBosses(tx: DrizzleTx, userId: string): Promise<number> {
  const [countRow] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(bosses)
    .innerJoin(quests, eq(bosses.questId, quests.id))
    .where(and(eq(quests.userId, userId), isNull(bosses.judgedAt)));
  return Number(countRow?.total ?? 0);
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

function toQuest(questRow: QuestRow, today: string): Quest {
  const reward =
    questRow.schedule === 'routine'
      ? QUEST_REWARDS[questRow.difficulty].daily
      : deadlineReward(
          questRow.difficulty,
          questRow.pace ?? 'steady',
          questRow.endsOn ?? '',
          today,
        );
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
      pace: null,
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
    pace: questRow.pace ?? 'steady',
    weekdays: null,
    biweekly: null,
    endsOn: questRow.endsOn ?? '',
    restFrom: null,
    restUntil: null,
  };
}

function deadlineReward(
  difficulty: QuestDifficulty,
  pace: QuestPace,
  endsOn: string,
  today: string,
): { gold: number; xp: number } {
  if (pace === 'once') {
    return QUEST_REWARDS[difficulty].daily;
  }
  const period = rewardPeriodForRemainingDays(calendarDaysBetween(today, endsOn));
  return QUEST_REWARDS[difficulty][period];
}

function toBossSummary(
  questRow: QuestRow,
  bossRow: BossRow,
  task: MonsterTaskState | undefined,
): BossSummary {
  const appearance = bossForList(task);
  return {
    id: questRow.id,
    category: questRow.category,
    title: questRow.title,
    endsOn: questRow.endsOn ?? '',
    maxHp: bossRow.maxHp,
    hp: bossRow.hp,
    createdOn: seoulCalendarDate(questRow.createdAt),
    ...appearance,
  };
}

function bossForList(task: MonsterTaskState | undefined): {
  bossStatus: MonsterStatus | null;
  boss: BossAppearance | null;
} {
  if (!task || task.status === 'pending' || task.status === 'running') {
    return { bossStatus: task ? 'generating' : null, boss: null };
  }
  if (task.status === 'failed') {
    return { bossStatus: 'failed', boss: null };
  }
  const boss = bossFromResult(task.result);
  if (!boss) {
    return { bossStatus: 'failed', boss: null };
  }
  return { bossStatus: 'ready', boss };
}

function bossFromResult(result: unknown): BossAppearance | null {
  if (typeof result !== 'object' || result === null || Array.isArray(result)) {
    return null;
  }
  const record = result as Record<string, unknown>;
  if (typeof record.kind !== 'string' || !isBossKind(record.kind)) {
    return null;
  }
  if (typeof record.name !== 'string' || typeof record.description !== 'string') {
    return null;
  }
  const name = record.name.trim();
  const description = record.description.trim();
  if (!name || !description) {
    return null;
  }
  return {
    kind: record.kind,
    imageKey: BOSS_IMAGE_KEYS[record.kind],
    name,
    description,
  };
}
