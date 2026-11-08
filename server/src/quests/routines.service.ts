import type { QuestWeekday, Routine } from '@nest-vue/shared';
import { MONSTER_IMAGE_KEYS, MONSTER_KINDS, QUEST_WEEKDAYS, isMonsterKind } from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { AI_QUEUE, type AiQueue } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { monsters } from '../database/schema/monsters';
import type { RoutineRow } from '../database/schema/routines';
import { routines } from '../database/schema/routines';
import { toRoutine } from './boss-plan.service';
import type { CreateRoutineDto } from './dto/create-routine.dto';
import type { UpdateRoutineDto } from './dto/update-routine.dto';
import { monsterView } from './monster-view';
import { RoutineSpawnService } from './routine-spawn.service';

const ROUTINE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
    private readonly routineSpawnService: RoutineSpawnService,
  ) {}

  async list(userId: string): Promise<Routine[]> {
    const routineRows = await this.db
      .select()
      .from(routines)
      .where(eq(routines.userId, userId))
      .orderBy(desc(routines.createdAt), desc(routines.id));
    return this.withMonsters(routineRows);
  }

  async create(userId: string, dto: CreateRoutineDto): Promise<Routine> {
    const title = dto.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }
    const weekdays = uniqueSortedWeekdays(dto.weekdays);
    if (weekdays.length < 1) {
      throw new BadRequestException('weekdays must contain at least one weekday');
    }

    const [routineRow] = await this.db
      .insert(routines)
      .values({
        userId,
        title,
        category: dto.category,
        difficulty: dto.difficulty,
        weekdays,
        biweekly: dto.biweekly,
      })
      .returning();
    if (!routineRow) {
      throw new InternalServerErrorException('routine insert returned no row');
    }

    await this.routineSpawnService.spawnToday(userId);
    await this.enqueueMonster(userId, routineRow.id, title);
    const [fresh] = await this.withMonsters([routineRow]);
    return fresh ?? toRoutine(routineRow, null);
  }

  async update(userId: string, routineId: string, dto: UpdateRoutineDto): Promise<Routine> {
    assertRoutineId(routineId);
    if (
      dto.title === undefined &&
      dto.category === undefined &&
      dto.difficulty === undefined &&
      dto.weekdays === undefined &&
      dto.biweekly === undefined
    ) {
      throw new BadRequestException('routine update is empty');
    }

    const title = dto.title?.trim();
    if (dto.title !== undefined && !title) {
      throw new BadRequestException('title must not be empty');
    }
    const weekdays = dto.weekdays === undefined ? undefined : uniqueSortedWeekdays(dto.weekdays);
    if (weekdays && weekdays.length < 1) {
      throw new BadRequestException('weekdays must contain at least one weekday');
    }

    const saved = await this.db.transaction(async (tx) => {
      const routineRow = await lockOwnedRoutine(tx, userId, routineId);
      if (routineRow.bossId !== null) {
        throw new BadRequestException('a boss routine cannot be updated');
      }
      const [updated] = await tx
        .update(routines)
        .set({
          title: title ?? routineRow.title,
          category: dto.category ?? routineRow.category,
          difficulty: dto.difficulty ?? routineRow.difficulty,
          weekdays: weekdays ?? routineRow.weekdays,
          biweekly: dto.biweekly ?? routineRow.biweekly,
        })
        .where(eq(routines.id, routineRow.id))
        .returning();
      if (!updated) {
        throw new InternalServerErrorException('routine update returned no row');
      }
      const enqueueTitle = title !== undefined && title !== routineRow.title ? title : null;
      return { row: updated, enqueueTitle };
    });

    if (saved.enqueueTitle) {
      await this.enqueueMonster(userId, routineId, saved.enqueueTitle);
    }
    const [view] = await this.withMonsters([saved.row]);
    return view ?? toRoutine(saved.row, null);
  }

  async pause(userId: string, routineId: string): Promise<Routine> {
    return this.setActive(userId, routineId, false);
  }

  async resume(userId: string, routineId: string): Promise<Routine> {
    const routine = await this.setActive(userId, routineId, true);
    await this.routineSpawnService.spawnToday(userId);
    return routine;
  }

  async remove(userId: string, routineId: string): Promise<void> {
    assertRoutineId(routineId);
    const deleted = await this.db
      .delete(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .returning({ id: routines.id });
    if (deleted.length === 0) {
      throw new NotFoundException();
    }
  }

  private async setActive(userId: string, routineId: string, active: boolean): Promise<Routine> {
    assertRoutineId(routineId);
    return this.db.transaction(async (tx) => {
      const routineRow = await lockOwnedRoutine(tx, userId, routineId);
      if (routineRow.bossId !== null) {
        throw new BadRequestException(
          active ? 'a boss routine cannot be resumed' : 'a boss routine cannot be paused',
        );
      }
      const saved =
        routineRow.active === active ? routineRow : await updateActive(tx, routineRow.id, active);
      const [view] = await this.withMonsters([saved]);
      return view ?? toRoutine(saved, null);
    });
  }

  private async enqueueMonster(userId: string, routineId: string, title: string): Promise<void> {
    try {
      await this.queue.enqueue({
        userId,
        owner: { routineId },
        payload: { title, kinds: [...MONSTER_KINDS] },
      });
    } catch (error) {
      this.logger.error(
        `monster enqueue failed for routine ${routineId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async withMonsters(routineRows: RoutineRow[]): Promise<Routine[]> {
    if (routineRows.length === 0) {
      return [];
    }
    const monsterIds = routineRows.flatMap((routineRow) =>
      routineRow.monsterId ? [routineRow.monsterId] : [],
    );
    const [monsterRows, tasks] = await Promise.all([
      monsterIds.length === 0
        ? Promise.resolve([])
        : this.db.select().from(monsters).where(inArray(monsters.id, monsterIds)),
      this.queue.findTasks({ routineIds: routineRows.map((routineRow) => routineRow.id) }),
    ]);
    const monsterById = new Map(monsterRows.map((row) => [row.id, row]));
    const taskByRoutine = new Map(
      tasks.flatMap((task) => (task.routineId ? [[task.routineId, task] as const] : [])),
    );
    return routineRows.map((routineRow) => {
      const taskStatus = taskByRoutine.get(routineRow.id)?.status;
      const generating = taskStatus === 'pending' || taskStatus === 'running';
      const monsterRow = routineRow.monsterId ? monsterById.get(routineRow.monsterId) : undefined;
      const appearance = monsterView(
        generating ? undefined : monsterRow,
        taskStatus,
        isMonsterKind,
        (kind) => MONSTER_IMAGE_KEYS[kind],
      );
      return toRoutine(routineRow, appearance);
    });
  }
}

function assertRoutineId(routineId: string): void {
  if (!ROUTINE_ID_PATTERN.test(routineId)) {
    throw new NotFoundException();
  }
}

function uniqueSortedWeekdays(weekdays: QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

async function lockOwnedRoutine(
  tx: DrizzleTx,
  userId: string,
  routineId: string,
): Promise<RoutineRow> {
  const [routineRow] = await tx
    .select()
    .from(routines)
    .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
    .for('update');
  if (!routineRow) {
    throw new NotFoundException();
  }
  return routineRow;
}

async function updateActive(
  tx: DrizzleTx,
  routineId: string,
  active: boolean,
): Promise<RoutineRow> {
  const [routineRow] = await tx
    .update(routines)
    .set({ active })
    .where(eq(routines.id, routineId))
    .returning();
  if (!routineRow) {
    throw new InternalServerErrorException('routine update returned no row');
  }
  return routineRow;
}
