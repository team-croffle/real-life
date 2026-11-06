import { Module } from '@nestjs/common';

import { AI } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import { DifficultyController } from './difficulty.controller';
import { DifficultyService } from './difficulty.service';
import { GeminiAi } from './gemini-ai';
import { QuestPlanController } from './quest-plan.controller';
import { QuestPlanService } from './quest-plan.service';

@Module({
  controllers: [DifficultyController, QuestPlanController],
  providers: [
    { provide: AI, useClass: GeminiAi },
    AiCallLimiter,
    DifficultyService,
    QuestPlanService,
  ],
  exports: [AI, AiCallLimiter],
})
export class AiModule {}
