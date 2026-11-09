import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { AI_QUEUE, type AiQueue, type MonsterTaskOwner } from '../ai-queue/ai-queue';
import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { bosses } from '../database/schema/bosses';
import { quests } from '../database/schema/quests';
import { routines } from '../database/schema/routines';

const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class MonsterRetryService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AI_QUEUE) private readonly queue: AiQueue,
  ) {}

  async requeueQuest(userId: string, questId: string): Promise<void> {
    const questRow = await this.ownedQuest(userId, questId);
    const owner: MonsterTaskOwner = questRow.routineId
      ? { routineId: questRow.routineId }
      : { questId: questRow.id };
    await this.requeue(owner);
  }

  async requeueRoutine(userId: string, routineId: string): Promise<void> {
    await this.ownedRoutine(userId, routineId);
    await this.requeue({ routineId });
  }

  async requeueBoss(userId: string, bossId: string): Promise<void> {
    await this.ownedBoss(userId, bossId);
    await this.requeue({ bossId });
  }

  private async requeue(owner: MonsterTaskOwner): Promise<void> {
    const requeued = await this.queue.requeueFailed(owner);
    if (!requeued) {
      throw new ConflictException('monster task is not failed');
    }
  }

  private async ownedQuest(
    userId: string,
    questId: string,
  ): Promise<{ id: string; routineId: string | null }> {
    if (!ID_PATTERN.test(questId)) {
      throw new NotFoundException();
    }
    const [questRow] = await this.db
      .select({ id: quests.id, routineId: quests.routineId })
      .from(quests)
      .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
      .limit(1);
    if (!questRow) {
      throw new NotFoundException();
    }
    return questRow;
  }

  private async ownedRoutine(userId: string, routineId: string): Promise<void> {
    if (!ID_PATTERN.test(routineId)) {
      throw new NotFoundException();
    }
    const [routineRow] = await this.db
      .select({ id: routines.id })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!routineRow) {
      throw new NotFoundException();
    }
  }

  private async ownedBoss(userId: string, bossId: string): Promise<void> {
    if (!ID_PATTERN.test(bossId)) {
      throw new NotFoundException();
    }
    const [bossRow] = await this.db
      .select({ id: bosses.id })
      .from(bosses)
      .where(and(eq(bosses.id, bossId), eq(bosses.userId, userId)))
      .limit(1);
    if (!bossRow) {
      throw new NotFoundException();
    }
  }
}
