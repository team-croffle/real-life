import type { QuestWeekday } from '@nest-vue/shared';
import { APP_TIME_ZONE, QUEST_WEEKDAYS } from '@nest-vue/shared';

export function appCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function sortWeekdays(weekdays: readonly QuestWeekday[]): QuestWeekday[] {
  const selected = new Set(weekdays);
  return QUEST_WEEKDAYS.filter((weekday) => selected.has(weekday));
}
