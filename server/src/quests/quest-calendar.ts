import type { QuestRewardPeriod, QuestWeekday } from '@nest-vue/shared';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS,
} from '@nest-vue/shared';

const WEEKDAYS_FROM_UTC_DAY: QuestWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const APP_TIME_ZONE = 'Asia/Seoul';

export function seoulCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
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

export function calendarDaysBetween(fromDate: string, toDate: string): number {
  return Math.round((calendarDateToUtc(toDate) - calendarDateToUtc(fromDate)) / 86_400_000);
}

export function weekdayOfCalendarDate(value: string): QuestWeekday {
  return WEEKDAYS_FROM_UTC_DAY[new Date(calendarDateToUtc(value)).getUTCDay()];
}

/** 등록한 주(한국 시간, 월~일)가 0이고, 짝수 주만 수행 주다. */
export function isBiweeklyOnWeek(createdOn: string, today: string): boolean {
  const weeks = calendarDaysBetween(mondayOf(createdOn), mondayOf(today)) / 7;
  return weeks % 2 === 0;
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

function mondayOf(value: string): string {
  const utcDay = new Date(calendarDateToUtc(value)).getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  return addCalendarDays(value, -daysSinceMonday);
}

function addCalendarDays(value: string, days: number): string {
  const utc = new Date(calendarDateToUtc(value) + days * 86_400_000);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calendarDateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
