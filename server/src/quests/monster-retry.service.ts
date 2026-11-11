import { BOSS_KINDS, MONSTER_KINDS } from '@nest-vue/shared';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import {
  AI_QUEUE,
  type AiQueue,
  type MonsterTaskOwner,
  type MonsterTaskPayload,
} from '../ai-queue/ai-queue';
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
    if (questRow.routineId) {
      const title = await this.routineTitle(userId, questRow.routineId);
      await this.requeue({ routineId: questRow.routineId }, monsterPayload(title));
      return;
    }
    await this.requeue({ questId: questRow.id }, monsterPayload(questRow.title));
  }

  async requeueRoutine(userId: string, routineId: string): Promise<void> {
    const title = await this.routineTitle(userId, routineId);
    await this.requeue({ routineId }, monsterPayload(title));
  }

  async requeueBoss(userId: string, bossId: string): Promise<void> {
    const goal = await this.ownedBossGoal(userId, bossId);
    await this.requeue({ bossId }, { title: goal, kinds: [...BOSS_KINDS] });
  }

  private async requeue(owner: MonsterTaskOwner, payload: MonsterTaskPayload): Promise<void> {
    const requeued = await this.queue.requeueFailed(owner, payload);
    if (!requeued) {
      throw new ConflictException('monster task is not failed');
    }
  }

  private async ownedQuest(
    userId: string,
    questId: string,
  ): Promise<{ id: string; routineId: string | null; title: string }> {
    if (!ID_PATTERN.test(questId)) {
      throw new NotFoundException();
    }
    const [questRow] = await this.db
      .select({ id: quests.id, routineId: quests.routineId, title: quests.title })
      .from(quests)
      .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
      .limit(1);
    if (!questRow) {
      throw new NotFoundException();
    }
    return questRow;
  }

  private async routineTitle(userId: string, routineId: string): Promise<string> {
    if (!ID_PATTERN.test(routineId)) {
      throw new NotFoundException();
    }
    const [routineRow] = await this.db
      .select({ title: routines.title })
      .from(routines)
      .where(and(eq(routines.id, routineId), eq(routines.userId, userId)))
      .limit(1);
    if (!routineRow) {
      throw new NotFoundException();
    }
    return routineRow.title;
  }

  private async ownedBossGoal(userId: string, bossId: string): Promise<string> {
    if (!ID_PATTERN.test(bossId)) {
      throw new NotFoundException();
    }
    const [bossRow] = await this.db
      .select({ goal: bosses.goal })
      .from(bosses)
      .where(and(eq(bosses.id, bossId), eq(bosses.userId, userId)))
      .limit(1);
    if (!bossRow) {
      throw new NotFoundException();
    }
    return bossRow.goal;
  }
}

function monsterPayload(title: string): MonsterTaskPayload {
  return { title, kinds: [...MONSTER_KINDS] };
}
