import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { AI_QUEUE } from './ai-queue';
import { AiQueueWorker } from './ai-queue.worker';
import { PostgresAiQueue } from './postgres-ai-queue';

@Module({
  imports: [AiModule],
  providers: [{ provide: AI_QUEUE, useClass: PostgresAiQueue }, AiQueueWorker],
  exports: [AI_QUEUE],
})
export class AiQueueModule {}
