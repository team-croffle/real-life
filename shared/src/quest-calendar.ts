import type { QuestWeekday } from './constants/quests';

const WEEKDAYS_FROM_UTC_DAY: QuestWeekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

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

/** 그 날짜가 속한 주의 월요일. 주는 월~일이다. */
export function mondayOf(value: string): string {
  const utcDay = new Date(calendarDateToUtc(value)).getUTCDay();
  const daysSinceMonday = utcDay === 0 ? 6 : utcDay - 1;
  return addCalendarDays(value, -daysSinceMonday);
}

/** 등록한 주(한국 시간, 월~일)가 0이고, 짝수 주만 수행 주다. */
export function isBiweeklyOnWeek(createdOn: string, today: string): boolean {
  const weeks = calendarDaysBetween(mondayOf(createdOn), mondayOf(today)) / 7;
  return weeks % 2 === 0;
}

/** 만든 날부터 throughOn까지, 양 끝 포함. 격주 기준은 createdOn이다. */
export function routineOccurrenceCount(
  routine: {
    weekdays: readonly QuestWeekday[] | null;
    biweekly: boolean | null;
  },
  createdOn: string,
  throughOn: string,
): number {
  if (throughOn < createdOn) {
    return 0;
  }
  let count = 0;
  for (let day = createdOn; day <= throughOn; day = addCalendarDays(day, 1)) {
    if (isRoutineScheduledOn(routine, createdOn, day)) {
      count += 1;
    }
  }
  return count;
}

/** 그날 요일에 해당하고, 격주면 만든 날이 속한 주부터 한 주 걸러다. */
export function isRoutineScheduledOn(
  routine: {
    weekdays: readonly QuestWeekday[] | null;
    biweekly: boolean | null;
  },
  createdOn: string,
  day: string,
): boolean {
  if (day < createdOn) {
    return false;
  }
  const weekdays = routine.weekdays ?? [];
  if (!weekdays.includes(weekdayOfCalendarDate(day))) {
    return false;
  }
  if (routine.biweekly && !isBiweeklyOnWeek(createdOn, day)) {
    return false;
  }
  return true;
}

function calendarDateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}
