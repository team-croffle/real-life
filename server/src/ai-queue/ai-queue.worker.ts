import { Inject, Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';

import { AI, AiRateLimitError, type Ai, type MonsterDraft } from '../ai/ai';
import { AI_QUEUE, type AiQueue } from './ai-queue';

@Injectable()
export class AiQueueWorker {
  private readonly logger = new Logger(AiQueueWorker.name);
  private ticking = false;

  constructor(
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
    @Inject(AI) private readonly ai: Ai,
  ) {}

  @Interval('ai-tasks', 5_000)
  async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }
    this.ticking = true;
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.error(
        'ai task tick failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.ticking = false;
    }
  }

  private async runOnce(): Promise<void> {
    const task = await this.queue.dequeue();
    if (!task) {
      return;
    }

    try {
      const payload = monsterDraft(task.payload);
      if (!payload) {
        await this.queue.fail(task.id, task.attempts, 'monster payload is invalid', false);
        return;
      }
      const result = task.bossId
        ? await this.ai.describeBoss(payload)
        : await this.ai.describeMonster(payload);
      await this.queue.complete(task.id, task.attempts, result);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await this.queue.fail(task.id, task.attempts, reason, error instanceof AiRateLimitError);
      } catch (failError) {
        this.logger.error(
          `ai task ${task.id} could not be updated`,
          failError instanceof Error ? failError.stack : String(failError),
        );
      }
    }
  }
}

function monsterDraft(value: unknown): MonsterDraft | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.title !== 'string' || !Array.isArray(record.kinds)) {
    return null;
  }
  if (!record.kinds.every((kind) => typeof kind === 'string')) {
    return null;
  }
  return { title: record.title, kinds: record.kinds };
}
