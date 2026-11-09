import { randomUUID } from 'node:crypto';

import type {
  BossSummary,
  ConfirmedBoss,
  Quest,
  QuestDifficulty,
  QuestPace,
  QuestWeekday,
  Routine,
  UnseenBossResult,
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
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { AI_QUEUE, type AiQueue, type MonsterTaskState } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import type { BossRow } from '../database/schema/bosses';
import { bosses } from '../database/schema/bosses';
import { monsters } from '../database/schema/monsters';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import type { RoutineRow } from '../database/schema/routines';
import { routines } from '../database/schema/routines';
import { userProgress } from '../database/schema/user-progress';
import { users } from '../database/schema/users';
import { walletEntries } from '../database/schema/wallets';
import type { ConfirmBossDto, ConfirmBossQuestDto } from './dto/confirm-boss.dto';
import { monsterView } from './monster-view';
import {
  APP_TIME_ZONE,
  calendarDaysBetween,
  isCalendarDate,
  rewardPeriodForRemainingDays,
  routineOccurrenceCount,
  seoulCalendarDate,
} from './quest-calendar';
import { QuestsService, toQuest } from './quests.service';
import { RoutineSpawnService } from './routine-spawn.service';

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
    private readonly routineSpawnService: RoutineSpawnService,
    private readonly questsService: QuestsService,
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

      const [bossRow] = await tx
        .insert(bosses)
        .values({
          userId,
          goal: title,
          category: dto.category,
          deadlineOn: dto.deadlineOn,
          maxHp,
          hp: maxHp,
        })
        .returning();
      if (!bossRow) {
        throw new InternalServerErrorException('boss insert returned no row');
      }

      const deadlineValues = planned.flatMap((item) =>
        item.schedule === 'deadline'
          ? [
              {
                id: randomUUID(),
                userId,
                category: item.category,
                title: item.title,
                difficulty: item.difficulty,
                pace: item.pace,
                endsOn: item.endsOn,
                bossId: bossRow.id,
              },
            ]
          : [],
      );
      const routineValues = planned.flatMap((item) =>
        item.schedule === 'routine'
          ? [
              {
                id: randomUUID(),
                userId,
                title: item.title,
                category: item.category,
                difficulty: item.difficulty,
                weekdays: item.weekdays,
                biweekly: item.biweekly,
                bossId: bossRow.id,
              },
            ]
          : [],
      );

      const questRows =
        deadlineValues.length === 0
          ? []
          : await tx.insert(quests).values(deadlineValues).returning();
      const routineRows =
        routineValues.length === 0
          ? []
          : await tx.insert(routines).values(routineValues).returning();
      await this.routineSpawnService.spawnToday(
        userId,
        today,
        tx,
        routineRows.map((routineRow) => routineRow.id),
      );

      return { bossRow, questRows, routineRows, maxHp, today };
    });

    await this.enqueueAll(
      userId,
      title,
      created.bossRow.id,
      created.questRows,
      created.routineRows,
    );
    return {
      id: created.bossRow.id,
      category: created.bossRow.category,
      title: created.bossRow.goal,
      endsOn: created.bossRow.deadlineOn,
      maxHp: created.maxHp,
      hp: created.maxHp,
      quests: created.questRows.map((questRow) => toDeadlineQuest(questRow, created.today)),
      routines: created.routineRows.map((routineRow) => toRoutine(routineRow, null)),
    };
  }

  async listUnseen(userId: string): Promise<UnseenBossResult[]> {
    await this.questsService.prepareForRead(userId);
    const bossRows = await this.db
      .select()
      .from(bosses)
      .where(
        and(
          eq(bosses.userId, userId),
          inArray(bosses.result, ['cleared', 'failed']),
          isNull(bosses.resultSeenAt),
        ),
      )
      .orderBy(asc(bosses.judgedAt), asc(bosses.id));
    if (bossRows.length === 0) {
      return [];
    }

    const entryRows = await this.db
      .select({
        bossId: walletEntries.bossId,
        amount: walletEntries.amount,
        tickets: walletEntries.tickets,
        kind: walletEntries.kind,
      })
      .from(walletEntries)
      .where(
        and(
          eq(walletEntries.userId, userId),
          inArray(
            walletEntries.bossId,
            bossRows.map((bossRow) => bossRow.id),
          ),
          inArray(walletEntries.kind, ['boss_clear', 'boss_fail']),
        ),
      );
    const payByBoss = new Map<string, { amount: number; tickets: number }>();
    for (const entryRow of entryRows) {
      if (!entryRow.bossId) {
        continue;
      }
      const bossRow = bossRows.find((row) => row.id === entryRow.bossId);
      const kind = bossRow?.result === 'cleared' ? 'boss_clear' : 'boss_fail';
      if (entryRow.kind !== kind) {
        continue;
      }
      payByBoss.set(entryRow.bossId, { amount: entryRow.amount, tickets: entryRow.tickets });
    }

    return bossRows.flatMap((bossRow) => {
      if (bossRow.result !== 'cleared' && bossRow.result !== 'failed') {
        return [];
      }
      const pay = payByBoss.get(bossRow.id);
      return [
        {
          id: bossRow.id,
          result: bossRow.result,
          category: bossRow.category,
          title: bossRow.goal,
          endsOn: bossRow.deadlineOn,
          maxHp: bossRow.maxHp,
          hp: bossRow.hp,
          judgedOn: bossRow.judgedAt ? seoulCalendarDate(bossRow.judgedAt) : '',
          gold: pay?.amount ?? 0,
          xp: bossRow.xpChange,
          tickets: pay?.tickets ?? 0,
        },
      ];
    });
  }

  async list(userId: string): Promise<BossSummary[]> {
    const bossRows = await this.db
      .select()
      .from(bosses)
      .where(and(eq(bosses.userId, userId), isNull(bosses.result)))
      .orderBy(desc(bosses.createdAt), desc(bosses.id));

    if (bossRows.length === 0) {
      return [];
    }

    const monsterIds = bossRows.flatMap((bossRow) =>
      bossRow.monsterId ? [bossRow.monsterId] : [],
    );
    const [monsterRows, tasks] = await Promise.all([
      monsterIds.length === 0
        ? Promise.resolve([])
        : this.db.select().from(monsters).where(inArray(monsters.id, monsterIds)),
      this.queue.findTasks({ bossIds: bossRows.map((bossRow) => bossRow.id) }),
    ]);
    const monsterById = new Map(monsterRows.map((row) => [row.id, row]));
    const taskByBoss = new Map(
      tasks.flatMap((task) => (task.bossId ? [[task.bossId, task] as const] : [])),
    );
    return bossRows.map((bossRow) =>
      toBossSummary(
        bossRow,
        bossRow.monsterId ? monsterById.get(bossRow.monsterId) : undefined,
        taskByBoss.get(bossRow.id),
      ),
    );
  }

  /** 큐에 넣지 못해도 확정은 그대로 둔다. 찍힌 하루 퀘스트에는 작업을 넣지 않는다. */
  private async enqueueAll(
    userId: string,
    goal: string,
    bossId: string,
    questRows: QuestRow[],
    routineRows: RoutineRow[],
  ): Promise<void> {
    await Promise.all([
      this.enqueue(userId, { bossId }, goal, [...BOSS_KINDS]),
      ...questRows.map((questRow) =>
        this.enqueue(userId, { questId: questRow.id }, questRow.title, [...MONSTER_KINDS]),
      ),
      ...routineRows.map((routineRow) =>
        this.enqueue(userId, { routineId: routineRow.id }, routineRow.title, [...MONSTER_KINDS]),
      ),
    ]);
  }

  private async enqueue(
    userId: string,
    owner: { questId: string } | { routineId: string } | { bossId: string },
    title: string,
    kinds: string[],
  ): Promise<void> {
    try {
      await this.queue.enqueue({ userId, owner, payload: { title, kinds } });
    } catch (error) {
      const ownerId =
        'questId' in owner ? owner.questId : 'routineId' in owner ? owner.routineId : owner.bossId;
      this.logger.error(
        `monster enqueue failed for ${ownerId}`,
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
    .where(and(eq(bosses.userId, userId), isNull(bosses.result)));
  return Number(countRow?.total ?? 0);
}

function uniqueSortedWeekdays(weekdays: QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

function toDeadlineQuest(questRow: QuestRow, today: string): Quest {
  return toQuest(
    questRow,
    deadlineReward(questRow.difficulty, questRow.pace, questRow.endsOn, today),
  );
}

export function toRoutine(
  routineRow: RoutineRow,
  appearance: { monsterStatus: Routine['monsterStatus']; monster: Routine['monster'] } | null,
): Routine {
  return {
    id: routineRow.id,
    title: routineRow.title,
    category: routineRow.category,
    difficulty: routineRow.difficulty,
    weekdays: routineRow.weekdays ?? [],
    biweekly: routineRow.biweekly,
    active: routineRow.active,
    bossId: routineRow.bossId,
    createdAt: routineRow.createdAt.toISOString(),
    monsterStatus: appearance?.monsterStatus ?? null,
    monster: appearance?.monster ?? null,
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
  bossRow: BossRow,
  monster: { kind: string; name: string; description: string } | undefined,
  task: MonsterTaskState | undefined,
): BossSummary {
  const appearance = monsterView(
    monster,
    task?.status,
    isBossKind,
    (kind) => BOSS_IMAGE_KEYS[kind],
  );
  return {
    id: bossRow.id,
    category: bossRow.category,
    title: bossRow.goal,
    endsOn: bossRow.deadlineOn,
    maxHp: bossRow.maxHp,
    hp: bossRow.hp,
    createdOn: seoulCalendarDate(bossRow.createdAt),
    bossStatus: appearance.monsterStatus,
    boss: appearance.monster,
  };
}
