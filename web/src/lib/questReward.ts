import type {
  QuestDifficulty,
  QuestRewardPeriod,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS,
  QUEST_REWARDS,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';

const APP_TIME_ZONE = 'Asia/Seoul';

const WEEKDAYS_FROM_UTC_DAY: readonly QuestWeekday[] = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
];

export interface RewardEstimate {
  gold: number;
  xp: number;
  period: QuestRewardPeriod;
}

export function seoulToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function seoulWeekday(now = new Date()): QuestWeekday {
  return WEEKDAYS_FROM_UTC_DAY[new Date(calendarDateToUtc(seoulToday(now))).getUTCDay()];
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day
  );
}

export function addCalendarDays(value: string, days: number): string {
  const utc = new Date(calendarDateToUtc(value) + days * 86_400_000);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calendarDaysBetween(fromDate: string, toDate: string): number {
  return Math.round((calendarDateToUtc(toDate) - calendarDateToUtc(fromDate)) / 86_400_000);
}

/** 루틴은 일일 열, 마감은 서울 오늘 기준 남은 일수. 지난 마감일은 null. */
export function estimateQuestReward(
  difficulty: QuestDifficulty,
  schedule: QuestSchedule,
  endsOn: string | null,
): RewardEstimate | null {
  if (schedule === 'routine') {
    const reward = QUEST_REWARDS[difficulty].daily;
    return { gold: reward.gold, xp: reward.xp, period: 'daily' };
  }

  if (!endsOn || !isCalendarDate(endsOn)) {
    return null;
  }

  const remainingDays = calendarDaysBetween(seoulToday(), endsOn);
  if (remainingDays < QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
    return null;
  }

  const period = rewardPeriodForRemainingDays(remainingDays);
  const reward = QUEST_REWARDS[difficulty][period];
  return { gold: reward.gold, xp: reward.xp, period };
}

export function sortWeekdays(weekdays: readonly QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
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

function calendarDateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
