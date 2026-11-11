import type { DifficultyRecommendation, QuestCategory } from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { and, count, eq, gte, isNull, lte } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { quests } from '../database/schema/quests';
import { tryConsumeAiButtonCall } from '../limits/daily-usage';
import { addCalendarDays, appCalendarDate } from '../quests/quest-calendar';
import { AI, DIFFICULTY_HISTORY_DAYS, type Ai } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import type { RecommendDifficultyDto } from './dto/recommend-difficulty.dto';

@Injectable()
export class DifficultyService {
  private readonly logger = new Logger(DifficultyService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AI) private readonly ai: Ai,
    private readonly aiCallLimiter: AiCallLimiter,
  ) {}

  async recommend(userId: string, dto: RecommendDifficultyDto): Promise<DifficultyRecommendation> {
    const title = dto.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }

    const today = appCalendarDate();
    const from = addCalendarDays(today, -(DIFFICULTY_HISTORY_DAYS - 1));
    const yesterday = addCalendarDays(today, -1);
    const [completedCount, missedCount] = await Promise.all([
      this.countCompleted(userId, dto.category, from, today),
      this.countMissed(userId, dto.category, from, yesterday),
    ]);

    const reserved = await this.db.transaction(async (tx) =>
      tryConsumeAiButtonCall(tx, userId, today, () => this.aiCallLimiter.tryAcquire()),
    );
    if (!reserved) {
      this.logger.warn('difficulty recommendation skipped: direct call limit');
      throw new ServiceUnavailableException();
    }
    try {
      return await this.ai.recommendDifficulty({
        title,
        category: dto.category,
        completedCount,
        missedCount,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`difficulty recommendation failed: ${reason}`);
      throw new ServiceUnavailableException();
    }
  }

  private async countCompleted(
    userId: string,
    category: QuestCategory,
    from: string,
    today: string,
  ): Promise<number> {
    const [countRow] = await this.db
      .select({ total: count() })
      .from(quests)
      .where(
        and(
          eq(quests.userId, userId),
          eq(quests.category, category),
          gte(quests.completedOn, from),
          lte(quests.completedOn, today),
        ),
      );
    return Number(countRow?.total ?? 0);
  }

  private async countMissed(
    userId: string,
    category: QuestCategory,
    from: string,
    yesterday: string,
  ): Promise<number> {
    const [countRow] = await this.db
      .select({ total: count() })
      .from(quests)
      .where(
        and(
          eq(quests.userId, userId),
          eq(quests.category, category),
          isNull(quests.completedOn),
          gte(quests.endsOn, from),
          lte(quests.endsOn, yesterday),
        ),
      );
    return Number(countRow?.total ?? 0);
  }
}
