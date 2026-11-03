import type { DifficultyRecommendation } from '@nest-vue/shared';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { AI, type Ai } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import type { RecommendDifficultyDto } from './dto/recommend-difficulty.dto';

@Injectable()
export class DifficultyService {
  private readonly logger = new Logger(DifficultyService.name);

  constructor(
    @Inject(AI) private readonly ai: Ai,
    private readonly aiCallLimiter: AiCallLimiter,
  ) {}

  async recommend(dto: RecommendDifficultyDto): Promise<DifficultyRecommendation> {
    if (!this.aiCallLimiter.tryAcquire()) {
      this.logger.warn('difficulty recommendation skipped: direct call limit');
      throw new ServiceUnavailableException();
    }
    try {
      return await this.ai.recommendDifficulty({ title: dto.title });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`difficulty recommendation failed: ${reason}`);
      throw new ServiceUnavailableException();
    }
  }
}
