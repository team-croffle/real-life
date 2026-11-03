import { Module } from '@nestjs/common';

import { AI } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import { DifficultyController } from './difficulty.controller';
import { DifficultyService } from './difficulty.service';
import { GeminiAi } from './gemini-ai';

@Module({
  controllers: [DifficultyController],
  providers: [{ provide: AI, useClass: GeminiAi }, AiCallLimiter, DifficultyService],
  exports: [AI, AiCallLimiter],
})
export class AiModule {}
