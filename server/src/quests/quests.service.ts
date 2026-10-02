import type { Quest, QuestWeekday } from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_REWARDS,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import { questCompletions } from '../database/schema/quest-completions';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import type { CreateQuestDto } from './dto/create-quest.dto';
import {
  APP_TIME_ZONE,
  calendarDaysBetween,
  isCalendarDate,
  rewardPeriodForRemainingDays,
  seoulCalendarDate,
} from './quest-calendar';

@Injectable()
export class QuestsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async create(userId: string, dto: CreateQuestDto): Promise<Quest> {
    const title = dto.title.trim();
    if (title.length < 1) {
      throw new BadRequestException('title must not be empty');
    }

    if (dto.schedule === 'routine') {
      if (dto.endsOn !== undefined) {
        throw new BadRequestException('routine quests cannot have endsOn');
      }

      const weekdays = uniqueSortedWeekdays(dto.weekdays ?? []);
      if (weekdays.length < 1) {
        throw new BadRequestException('weekdays must contain at least one weekday');
      }

      const [questRow] = await this.db
        .insert(quests)
        .values({
          userId,
          kind: dto.kind,
          category: dto.category,
          title,
          difficulty: dto.difficulty,
          schedule: 'routine',
          weekdays,
          biweekly: dto.biweekly,
          endsOn: null,
        })
        .returning();

      return toQuest(requireInserted(questRow), QUEST_REWARDS[dto.difficulty].daily);
    }

    if (dto.weekdays !== undefined || dto.biweekly !== undefined) {
      throw new BadRequestException('deadline quests cannot have weekdays or biweekly');
    }

    const endsOn = dto.endsOn ?? '';
    if (!isCalendarDate(endsOn)) {
      throw new BadRequestException('endsOn must be a calendar date YYYY-MM-DD');
    }

    const remainingDays = calendarDaysBetween(seoulCalendarDate(), endsOn);
    if (remainingDays < QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
      throw new BadRequestException(`endsOn must be today or later in ${APP_TIME_ZONE}`);
    }

    const period = rewardPeriodForRemainingDays(remainingDays);
    const [questRow] = await this.db
      .insert(quests)
      .values({
        userId,
        kind: dto.kind,
        category: dto.category,
        title,
        difficulty: dto.difficulty,
        schedule: 'deadline',
        weekdays: null,
        biweekly: null,
        endsOn,
      })
      .returning();

    return toQuest(requireInserted(questRow), QUEST_REWARDS[dto.difficulty][period]);
  }

  async abandon(userId: string, questId: string): Promise<void> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(questId)
    ) {
      throw new NotFoundException();
    }

    await this.db.transaction(async (tx) => {
      const [questRow] = await tx
        .select({ id: quests.id, schedule: quests.schedule })
        .from(quests)
        .where(and(eq(quests.id, questId), eq(quests.userId, userId)))
        .for('update');

      if (!questRow) {
        throw new NotFoundException();
      }

      if (questRow.schedule === 'deadline') {
        const [completionRow] = await tx
          .select({ id: questCompletions.id })
          .from(questCompletions)
          .where(eq(questCompletions.questId, questRow.id))
          .limit(1);

        if (completionRow) {
          throw new ConflictException('completed deadline quests cannot be abandoned');
        }
      }

      await tx.delete(quests).where(eq(quests.id, questRow.id));
    });
  }
}

function requireInserted(questRow: QuestRow | undefined): QuestRow {
  if (!questRow) {
    throw new InternalServerErrorException('quest insert returned no row');
  }
  return questRow;
}

function uniqueSortedWeekdays(weekdays: QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}

function toQuest(questRow: QuestRow, reward: { gold: number; xp: number }): Quest {
  const base = {
    id: questRow.id,
    userId: questRow.userId,
    kind: questRow.kind,
    category: questRow.category,
    title: questRow.title,
    difficulty: questRow.difficulty,
    gold: reward.gold,
    xp: reward.xp,
    createdAt: questRow.createdAt.toISOString(),
    updatedAt: questRow.updatedAt.toISOString(),
  };

  if (questRow.schedule === 'routine') {
    return {
      ...base,
      schedule: 'routine',
      weekdays: questRow.weekdays ?? [],
      biweekly: questRow.biweekly ?? false,
      endsOn: null,
    };
  }

  return {
    ...base,
    schedule: 'deadline',
    weekdays: null,
    biweekly: null,
    endsOn: questRow.endsOn ?? '',
  };
}
