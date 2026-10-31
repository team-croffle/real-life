import { Module } from '@nestjs/common';

import { AI } from './ai';
import { GeminiAi } from './gemini-ai';

@Module({
  providers: [{ provide: AI, useClass: GeminiAi }],
  exports: [AI],
})
export class AiModule {}
