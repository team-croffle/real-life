import type { Quest, QuestRewardPeriod, QuestWeekday } from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS,
  QUEST_REWARDS,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { DRIZZLE } from '../database/database.constants';
import type { DrizzleDb } from '../database/database.module';
import type { QuestRow } from '../database/schema/quests';
import { quests } from '../database/schema/quests';
import type { CreateQuestDto } from './dto/create-quest.dto';

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
      throw new BadRequestException('endsOn must be today or later in Asia/Seoul');
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

function seoulCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

function calendarDaysBetween(fromDate: string, toDate: string): number {
  return Math.round((calendarDateToUtc(toDate) - calendarDateToUtc(fromDate)) / 86_400_000);
}

function calendarDateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function rewardPeriodForRemainingDays(remainingDays: number): QuestRewardPeriod {
  if (remainingDays <= QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
    return 'daily';
  }
  if (remainingDays <= QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS) {
    return 'weekly';
  }
  return 'long_term';
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
