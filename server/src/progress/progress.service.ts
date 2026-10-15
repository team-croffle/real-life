import type { Progress } from '@nest-vue/shared';
import { xpRequiredToLevelUp } from '@nest-vue/shared';
import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { userProgress } from '../database/schema/user-progress';
import { userTitles } from '../database/schema/user-titles';

@Injectable()
export class ProgressService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getProgress(userId: string): Promise<Progress> {
    const [progressRows, titleRows] = await Promise.all([
      this.db
        .select({
          level: userProgress.level,
          xp: userProgress.xp,
          gachaTicketCount: userProgress.gachaTicketCount,
          comboDayCount: userProgress.comboDayCount,
          statusEffect: userProgress.statusEffect,
        })
        .from(userProgress)
        .where(eq(userProgress.userId, userId))
        .limit(1),
      this.db
        .select({ levelMark: userTitles.levelMark })
        .from(userTitles)
        .where(eq(userTitles.userId, userId))
        .orderBy(asc(userTitles.levelMark)),
    ]);

    const progressRow = progressRows[0];
    const level = progressRow?.level ?? 1;

    return {
      level,
      levelXp: progressRow?.xp ?? 0,
      xpToNext: xpRequiredToLevelUp(level),
      gachaTicketCount: progressRow?.gachaTicketCount ?? 0,
      comboDayCount: progressRow?.comboDayCount ?? 0,
      statusEffect: progressRow?.statusEffect ?? null,
      titleMarks: titleRows.map((titleRow) => titleRow.levelMark),
    };
  }
}
