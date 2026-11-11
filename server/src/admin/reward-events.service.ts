import type { CurrentRewardEvent, RewardEvent } from '@nest-vue/shared';
import {
  eventMultiplierFromTenths,
  eventMultiplierToTenths,
  isEventMultiplier,
} from '@nest-vue/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, gt, lte } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb, DrizzleTx } from '../database/database.module';
import { rewardEvents } from '../database/schema/reward-events';
import type { UpsertRewardEventDto } from './dto/upsert-reward-event.dto';

@Injectable()
export class RewardEventsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async activeMultiplier(
    now: Date = new Date(),
    db: DrizzleDb | DrizzleTx = this.db,
  ): Promise<number> {
    const active = await this.findActive(now, db);
    return active ? eventMultiplierFromTenths(active.multiplierTenths) : 1;
  }

  async current(now: Date = new Date()): Promise<CurrentRewardEvent | null> {
    const active = await this.findActive(now);
    if (!active) {
      return null;
    }
    return {
      multiplier: eventMultiplierFromTenths(active.multiplierTenths),
      endsAt: active.endsAt.toISOString(),
    };
  }

  async getStored(): Promise<RewardEvent | null> {
    const [row] = await this.db
      .select()
      .from(rewardEvents)
      .orderBy(desc(rewardEvents.updatedAt))
      .limit(1);
    return row ? toRewardEvent(row) : null;
  }

  async upsert(dto: UpsertRewardEventDto): Promise<RewardEvent> {
    if (!isEventMultiplier(dto.multiplier)) {
      throw new BadRequestException('multiplier must be 1.0 to 3.0 in steps of 0.1');
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }

    return this.db.transaction(async (tx) => {
      await tx.delete(rewardEvents);
      const [row] = await tx
        .insert(rewardEvents)
        .values({
          multiplierTenths: eventMultiplierToTenths(dto.multiplier),
          startsAt,
          endsAt,
        })
        .returning();
      if (!row) {
        throw new BadRequestException('could not save reward event');
      }
      return toRewardEvent(row);
    });
  }

  async end(now: Date = new Date()): Promise<RewardEvent | null> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(rewardEvents)
        .orderBy(desc(rewardEvents.updatedAt))
        .limit(1);
      if (!row) {
        throw new NotFoundException();
      }
      if (now <= row.startsAt) {
        await tx.delete(rewardEvents);
        return null;
      }
      if (row.endsAt <= now) {
        return toRewardEvent(row);
      }
      const [updated] = await tx.update(rewardEvents).set({ endsAt: now }).returning();
      if (!updated) {
        throw new NotFoundException();
      }
      return toRewardEvent(updated);
    });
  }

  private async findActive(now: Date, db: DrizzleDb | DrizzleTx = this.db) {
    const [row] = await db
      .select()
      .from(rewardEvents)
      .where(and(lte(rewardEvents.startsAt, now), gt(rewardEvents.endsAt, now)))
      .limit(1);
    return row ?? null;
  }
}

function toRewardEvent(row: typeof rewardEvents.$inferSelect): RewardEvent {
  return {
    id: row.id,
    multiplier: eventMultiplierFromTenths(row.multiplierTenths),
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
