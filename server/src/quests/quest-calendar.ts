import type { QuestRewardPeriod, QuestSchedule, QuestWeekday } from '@nest-vue/shared';
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

export function addCalendarDays(value: string, days: number): string {
  const utc = new Date(calendarDateToUtc(value) + days * 86_400_000);
  const year = utc.getUTCFullYear();
  const month = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utc.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 등록한 주(한국 시간, 월~일)가 0이고, 짝수 주만 수행 주다. */
export function isBiweeklyOnWeek(createdOn: string, today: string): boolean {
  const weeks = calendarDaysBetween(mondayOf(createdOn), mondayOf(today)) / 7;
  return weeks % 2 === 0;
}

export interface RoutineRestDates {
  restFrom: string | null;
  restUntil: string | null;
}

export function isRestingOn(quest: RoutineRestDates, day: string): boolean {
  if (quest.restFrom === null || day < quest.restFrom) {
    return false;
  }
  return quest.restUntil === null || day <= quest.restUntil;
}

export function isRoutineDueOn(
  quest: {
    schedule: QuestSchedule;
    weekdays: readonly QuestWeekday[] | null;
    biweekly: boolean | null;
  } & RoutineRestDates,
  createdOn: string,
  day: string,
): boolean {
  if (quest.schedule !== 'routine' || day < createdOn) {
    return false;
  }
  const weekdays = quest.weekdays ?? [];
  if (!weekdays.includes(weekdayOfCalendarDate(day))) {
    return false;
  }
  if (quest.biweekly && !isBiweeklyOnWeek(createdOn, day)) {
    return false;
  }
  return !isRestingOn(quest, day);
}

/**
 * 끄기 한 번. needsSettle이면 어제까지 정산한 뒤 다시 본다.
 * 이미 꺼져 있거나 오늘이 구간에 있으면 날짜를 옮기지 않는다.
 */
export function routineRestAfterPause(
  current: RoutineRestDates,
  today: string,
  penaltiesSettledOn: string,
): { needsSettle: true } | { needsSettle: false; rest: RoutineRestDates } {
  if (current.restFrom !== null && current.restUntil === null) {
    return { needsSettle: false, rest: current };
  }
  if (current.restFrom !== null && current.restUntil !== null && current.restUntil >= today) {
    return { needsSettle: false, rest: current };
  }
  if (
    current.restFrom !== null &&
    current.restUntil !== null &&
    current.restUntil > penaltiesSettledOn
  ) {
    return { needsSettle: true };
  }
  return {
    needsSettle: false,
    rest: { restFrom: addCalendarDays(today, 1), restUntil: null },
  };
}

/** 켜기 한 번. 오늘부터 예정이고, 어제 이전의 닫힌 구간은 남긴다. */
export function routineRestAfterResume(current: RoutineRestDates, today: string): RoutineRestDates {
  if (current.restFrom === null) {
    return current;
  }
  if (current.restUntil !== null && current.restUntil < today) {
    return current;
  }
  if (current.restFrom >= today) {
    return { restFrom: null, restUntil: null };
  }
  return { restFrom: current.restFrom, restUntil: addCalendarDays(today, -1) };
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

function mondayOf(value: string): string {
  const utcDay = new Date(calendarDateToUtc(value)).getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  return addCalendarDays(value, -daysSinceMonday);
}

function calendarDateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
