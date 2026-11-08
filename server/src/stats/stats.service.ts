import type { Stats } from '@nest-vue/shared';
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { userProgress } from '../database/schema/user-progress';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getStats(userId: string): Promise<Stats> {
    const [progressRow] = await this.db
      .select({
        stamina: userProgress.stamina,
        intellect: userProgress.intellect,
        sense: userProgress.sense,
      })
      .from(userProgress)
      .where(eq(userProgress.userId, userId))
      .limit(1);

    return {
      stamina: progressRow?.stamina ?? 0,
      intellect: progressRow?.intellect ?? 0,
      sense: progressRow?.sense ?? 0,
    };
  }
}
