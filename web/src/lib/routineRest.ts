import { seoulToday } from '@/lib/seoulDate';

export type RoutineRestPhase = 'on' | 'scheduled' | 'resting';

interface RoutineRestFields {
  schedule: string;
  restFrom: string | null;
  restUntil: string | null;
}

export interface RoutineRestNotice {
  key: 'startsTomorrow' | 'startsOn' | 'restingFrom' | 'restingUntil';
  values?: Record<string, string>;
}

export function routineRestPhase(quest: RoutineRestFields, today = seoulToday()): RoutineRestPhase {
  if (quest.schedule !== 'routine' || quest.restFrom === null) {
    return 'on';
  }
  if (today < quest.restFrom) {
    return 'scheduled';
  }
  if (quest.restUntil !== null && quest.restUntil < today) {
    return 'on';
  }
  return 'resting';
}

export function routineRestNotice(
  quest: RoutineRestFields,
  today = seoulToday(),
): RoutineRestNotice | null {
  const phase = routineRestPhase(quest, today);
  const { restFrom, restUntil } = quest;
  if (restFrom === null) {
    return null;
  }
  if (phase === 'scheduled') {
    if (addCalendarDays(today, 1) === restFrom) {
      return { key: 'startsTomorrow' };
    }
    return { key: 'startsOn', values: { date: restFrom } };
  }
  if (phase === 'resting') {
    if (restUntil !== null) {
      return { key: 'restingUntil', values: { from: restFrom, until: restUntil } };
    }
    return { key: 'restingFrom', values: { date: restFrom } };
  }
  return null;
}

function addCalendarDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day) + days * 86_400_000);
  const nextYear = utc.getUTCFullYear();
  const nextMonth = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const nextDay = String(utc.getUTCDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}
