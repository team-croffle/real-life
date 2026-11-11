import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, inArray, isNull, or } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import { quests } from '../database/schema/quests';
import type { RoutineRow } from '../database/schema/routines';
import { routines } from '../database/schema/routines';
import { appCalendarDate, isRoutineScheduledOn } from './quest-calendar';

@Injectable()
export class RoutineSpawnService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** 오늘 예정이고 오늘 아직 안 찍은 켜진 루틴마다 퀘스트를 하나 찍고, 찍은 날을 남긴다. 루틴을 id 순으로 잠근 뒤에 넣는다. */
  async spawnToday(
    userId: string,
    today = appCalendarDate(),
    tx?: DrizzleTx,
    onlyRoutineIds?: readonly string[],
  ): Promise<void> {
    if (onlyRoutineIds && onlyRoutineIds.length === 0) {
      return;
    }
    const run = async (db: DrizzleDb | DrizzleTx) => {
      const routineRows = await lockRoutinesToSpawn(db, userId, today, onlyRoutineIds);
      const due = routineRows.filter(
        (routineRow) =>
          routineRow.spawnedOn !== today &&
          isRoutineScheduledOn(routineRow, appCalendarDate(routineRow.createdAt), today),
      );
      if (due.length === 0) {
        return;
      }

      await db
        .insert(quests)
        .values(
          due.map((routineRow) => ({
            userId,
            category: routineRow.category,
            title: routineRow.title,
            difficulty: routineRow.difficulty,
            pace: 'once' as const,
            endsOn: today,
            bossId: routineRow.bossId,
            routineId: routineRow.id,
            monsterId: routineRow.monsterId,
          })),
        )
        .onConflictDoNothing({ target: [quests.routineId, quests.endsOn] });
      await db
        .update(routines)
        .set({ spawnedOn: today })
        .where(
          inArray(
            routines.id,
            due.map((routineRow) => routineRow.id),
          ),
        );
    };

    if (tx) {
      await run(tx);
      return;
    }
    await this.db.transaction(run);
  }
}

async function lockRoutinesToSpawn(
  db: DrizzleDb | DrizzleTx,
  userId: string,
  today: string,
  onlyRoutineIds: readonly string[] | undefined,
): Promise<RoutineRow[]> {
  if (onlyRoutineIds) {
    return db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), inArray(routines.id, [...onlyRoutineIds])))
      .orderBy(asc(routines.id))
      .for('update');
  }

  const rows = await db
    .select({ routine: routines })
    .from(routines)
    .leftJoin(bosses, eq(routines.bossId, bosses.id))
    .where(
      and(
        eq(routines.userId, userId),
        eq(routines.active, true),
        // 보스 마감일이 오늘보다 이전이면 찍지 않는다. 판정 결과와 상관없이 마감일로 거른다.
        or(isNull(routines.bossId), gte(bosses.deadlineOn, today)),
      ),
    )
    .orderBy(asc(routines.id))
    .for('update', { of: routines });
  return rows.map((row) => row.routine);
}
