import type { QuestPlan, QuestPlanQuest } from '@nest-vue/shared';
import { bossQuestHp } from '@nest-vue/shared';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  calendarDaysBetween,
  isCalendarDate,
  routineOccurrenceCount,
  seoulCalendarDate,
} from '../quests/quest-calendar';
import { AI, type Ai, type SuggestedQuest } from './ai';
import { AiCallLimiter } from './ai-call-limiter';
import type { SuggestQuestPlanDto } from './dto/suggest-quest-plan.dto';

@Injectable()
export class QuestPlanService {
  private readonly logger = new Logger(QuestPlanService.name);

  constructor(
    @Inject(AI) private readonly ai: Ai,
    private readonly aiCallLimiter: AiCallLimiter,
  ) {}

  async suggest(dto: SuggestQuestPlanDto): Promise<QuestPlan> {
    const goal = dto.goal.trim();
    if (goal.length < 1) {
      throw new BadRequestException('goal must not be empty');
    }
    if (!isCalendarDate(dto.deadlineOn)) {
      throw new BadRequestException('deadlineOn must be a calendar date YYYY-MM-DD');
    }
    const today = seoulCalendarDate();
    if (calendarDaysBetween(today, dto.deadlineOn) < 0) {
      throw new BadRequestException('deadlineOn must be today or later in Asia/Seoul');
    }

    if (!this.aiCallLimiter.tryAcquire()) {
      this.logger.warn('quest plan skipped: direct call limit');
      throw new ServiceUnavailableException();
    }
    let suggested: SuggestedQuest[];
    try {
      suggested = await this.ai.suggestPlan({
        goal,
        deadlineOn: dto.deadlineOn,
        today,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.warn(`quest plan failed: ${reason}`);
      throw new ServiceUnavailableException();
    }

    const kept = suggested.filter((quest) => isDeadlineInsideWindow(quest, today, dto.deadlineOn));
    if (kept.length === 0) {
      this.logger.warn('quest plan had no quests inside the deadline');
      throw new ServiceUnavailableException();
    }
    const quests = kept.map((quest) => toPlanQuest(quest, today, dto.deadlineOn));
    return {
      quests,
      totalHp: quests.reduce((sum, quest) => sum + quest.hp, 0),
    };
  }
}

function isDeadlineInsideWindow(quest: SuggestedQuest, today: string, deadlineOn: string): boolean {
  if (quest.schedule !== 'deadline' || quest.endsOn === null) {
    return true;
  }
  return quest.endsOn >= today && quest.endsOn <= deadlineOn;
}

function toPlanQuest(quest: SuggestedQuest, today: string, deadlineOn: string): QuestPlanQuest {
  const times = timesUntilDeadline(quest, today, deadlineOn);
  return { ...quest, times, hp: bossQuestHp(times, quest.difficulty) };
}

function timesUntilDeadline(quest: SuggestedQuest, today: string, deadlineOn: string): number {
  if (quest.schedule === 'deadline') {
    return 1;
  }
  return routineOccurrenceCount(
    { weekdays: quest.weekdays, biweekly: quest.biweekly },
    today,
    deadlineOn,
  );
}
