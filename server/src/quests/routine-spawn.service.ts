import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { quests } from '../database/schema/quests';
import { routines } from '../database/schema/routines';
import { isRoutineScheduledOn, seoulCalendarDate } from './quest-calendar';

@Injectable()
export class RoutineSpawnService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** 오늘 예정인 켜진 루틴마다 퀘스트를 하나 찍는다. 이미 있으면 아무것도 안 한다. */
  async spawnToday(userId: string, today = seoulCalendarDate(), tx?: DrizzleTx): Promise<void> {
    const db = tx ?? this.db;
    const routineRows = await db
      .select()
      .from(routines)
      .where(and(eq(routines.userId, userId), eq(routines.active, true)));

    const due = routineRows.filter((routineRow) =>
      isRoutineScheduledOn(routineRow, seoulCalendarDate(routineRow.createdAt), today),
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
  }
}
