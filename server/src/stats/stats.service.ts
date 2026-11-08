import type { Stats } from '@nest-vue/shared';
import { QUEST_CATEGORY_STATS } from '@nest-vue/shared';
import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, sum } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { quests } from '../database/schema/quests';

@Injectable()
export class StatsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async getStats(userId: string): Promise<Stats> {
    const categoryXpRows = await this.db
      .select({
        category: quests.category,
        xp: sum(quests.xp).mapWith(Number),
      })
      .from(quests)
      .where(and(eq(quests.userId, userId), isNotNull(quests.xp)))
      .groupBy(quests.category);

    const stats: Stats = { stamina: 0, intellect: 0, sense: 0 };
    for (const categoryXp of categoryXpRows) {
      stats[QUEST_CATEGORY_STATS[categoryXp.category]] += categoryXp.xp;
    }
    return stats;
  }
}
