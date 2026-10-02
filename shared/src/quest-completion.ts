import type { JobClass } from './constants/jobs';
import { JOB_CLASS_REWARD_MULTIPLIERS } from './constants/jobs';
import type { QuestCategory, QuestDifficulty, QuestRewardPeriod } from './constants/quests';
import {
  QUEST_DEADLINE_DAILY_REMAINING_DAYS,
  QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS,
  QUEST_REWARDS,
} from './constants/quests';

export const QUEST_NOTE_MAX_LENGTH = 500;

export const LEVEL_CAP = 50;

export const TITLE_LEVEL_MARKS = [10, 20, 30, 40, 50] as const;

export type TitleLevelMark = (typeof TITLE_LEVEL_MARKS)[number];

/** 명세 4.1. 완료 배율은 이 스탯을 본다. */
export const QUEST_CATEGORY_STATS = {
  exercise: 'stamina',
  life: 'stamina',
  study: 'intellect',
  work: 'intellect',
  creation: 'sense',
  mind: 'sense',
} as const satisfies Record<QuestCategory, 'stamina' | 'intellect' | 'sense'>;

export function jobRewardMultiplier(jobClass: JobClass, category: QuestCategory): number {
  const stat = QUEST_CATEGORY_STATS[category];
  return JOB_CLASS_REWARD_MULTIPLIERS[jobClass][stat] ?? 1;
}

export function rewardPeriodForDaySpan(daySpan: number): QuestRewardPeriod {
  if (daySpan <= QUEST_DEADLINE_DAILY_REMAINING_DAYS) {
    return 'daily';
  }
  if (daySpan <= QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS) {
    return 'weekly';
  }
  return 'long_term';
}

/**
 * 만든 날과 끝낸 날의 날짜 차이로 표를 고르고, 체크 횟수 / 걸린 일수를 곱한다.
 * 같은 날이면 일일 금액이고 비율은 1이다. 걸린 일수는 양 끝 날을 포함한다.
 */
export function completionTableAmount(
  difficulty: QuestDifficulty,
  daySpan: number,
  markedDayCount: number,
): { gold: number; xp: number; markedDays: number; elapsedDays: number } {
  if (daySpan <= 0) {
    const daily = QUEST_REWARDS[difficulty].daily;
    return { gold: daily.gold, xp: daily.xp, markedDays: 1, elapsedDays: 1 };
  }

  const period = rewardPeriodForDaySpan(daySpan);
  const table = QUEST_REWARDS[difficulty][period];
  const elapsedDays = daySpan + 1;
  const markedDays = Math.min(Math.max(markedDayCount, 0), elapsedDays);
  return { gold: table.gold, xp: table.xp, markedDays, elapsedDays };
}

/** 표 금액, 비율, 직업 배율, 수행 내용 10%를 한 번에 반올림한다. */
export function grantAmount(
  tableAmount: number,
  markedDays: number,
  elapsedDays: number,
  multiplier: number,
  noteBonus: boolean,
): number {
  const multiplierTenths = Math.round(multiplier * 10);
  const noteTenths = noteBonus ? 11 : 10;
  return Math.round(
    (tableAmount * markedDays * multiplierTenths * noteTenths) / (elapsedDays * 100),
  );
}

export function xpRequiredToLevelUp(level: number): number | null {
  if (level >= LEVEL_CAP) {
    return null;
  }
  if (level <= 10) {
    return 100;
  }
  if (level <= 30) {
    return 200;
  }
  return 400;
}

export function applyLevelXp(
  level: number,
  levelXp: number,
  gainedXp: number,
): { level: number; levelXp: number; ticketsGranted: number; titlesGranted: number[] } {
  if (level >= LEVEL_CAP || gainedXp <= 0) {
    return {
      level: Math.min(level, LEVEL_CAP),
      levelXp: level >= LEVEL_CAP ? 0 : levelXp,
      ticketsGranted: 0,
      titlesGranted: [],
    };
  }

  let nextLevel = level;
  let nextXp = levelXp;
  let ticketsGranted = 0;
  const titlesGranted: number[] = [];
  let remaining = gainedXp;

  while (remaining > 0 && nextLevel < LEVEL_CAP) {
    const required = xpRequiredToLevelUp(nextLevel);
    if (required === null) {
      break;
    }
    const room = required - nextXp;
    if (remaining < room) {
      nextXp += remaining;
      remaining = 0;
      break;
    }
    remaining -= room;
    nextLevel += 1;
    nextXp = 0;
    ticketsGranted += 1;
    if ((TITLE_LEVEL_MARKS as readonly number[]).includes(nextLevel)) {
      titlesGranted.push(nextLevel);
    }
  }

  if (nextLevel >= LEVEL_CAP) {
    nextLevel = LEVEL_CAP;
    nextXp = 0;
  }

  return { level: nextLevel, levelXp: nextXp, ticketsGranted, titlesGranted };
}
