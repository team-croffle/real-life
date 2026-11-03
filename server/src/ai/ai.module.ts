import { Module } from '@nestjs/common';

import { AI } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import { GeminiAi } from './gemini-ai';

@Module({
  providers: [{ provide: AI, useClass: GeminiAi }, AiCallLimiter],
  exports: [AI, AiCallLimiter],
})
export class AiModule {}
