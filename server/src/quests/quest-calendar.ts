import type { QuestRewardPeriod } from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS,
} from '@nest-vue/shared';

export {
  addCalendarDays,
  calendarDaysBetween,
  isBiweeklyOnWeek,
  isCalendarDate,
  isRoutineScheduledOn,
  mondayOf,
  routineOccurrenceCount,
  weekdayOfCalendarDate,
} from '@nest-vue/shared';

export const APP_TIME_ZONE = 'Asia/Seoul';

export function seoulCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 만든 날과 끝나는 날을 포함한다. */
export function isDeadlineInPeriod(createdOn: string, endsOn: string, day: string): boolean {
  return day >= createdOn && day <= endsOn;
}

export function rewardPeriodForRemainingDays(remainingDays: number): QuestRewardPeriod {
  if (remainingDays <= QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
    return 'daily';
  }
  if (remainingDays <= QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS) {
    return 'weekly';
  }
  return 'long_term';
}
