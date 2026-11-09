import type {
  JobClass,
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestRewardApplied,
  QuestSchedule,
} from '@nest-vue/shared';
import { completionTableAmount, grantAmount, jobRewardMultiplier } from '@nest-vue/shared';

import { calendarDaysBetween, isCalendarDate, seoulToday } from '@/lib/seoulDate';

/** 메모를 적으면 붙는 배율. 서버 grantAmount의 10분의 11과 같다. */
const NOTE_MULTIPLIER = 1.1;

export type RewardTagType = 'job' | 'combo' | 'note' | 'crit';

/** 보상을 늘린 항목 하나. 배율이 1이면 만들지 않는다. */
export interface RewardTag {
  type: RewardTagType;
  multiplier: number;
}

/** 보상이 줄어든 이유. 기한 퀘스트를 일부 날만 체크했을 때만 있다. */
export interface RewardReceipt {
  baseGold: number;
  markedDays: number;
  elapsedDays: number;
  ratio: number;
}

export interface RewardBreakdown {
  tags: RewardTag[];
  receipt: RewardReceipt | null;
  /** 받은 금액 아래 "기본 ○G" 줄. 금액이 기본과 다르고 영수증이 없을 때만 보인다. */
  showBaseGold: boolean;
  baseGold: number;
  crit: number;
}

/** 등록 폼과 보스 하위 줄의 예상 골드·경험치. 메모·연속·크리티컬은 넣지 않는다. */
export function estimatedRegisterReward(input: {
  schedule: QuestSchedule;
  difficulty: QuestDifficulty;
  category: QuestCategory;
  jobClass: JobClass;
  pace?: QuestPace;
  endsOn?: string;
}): { gold: number; xp: number; days?: number } | null {
  const multiplier = jobRewardMultiplier(input.jobClass, input.category);
  if (input.schedule === 'routine') {
    const table = completionTableAmount(input.difficulty, 0, 0);
    return {
      gold: grantAmount(table.gold, table.markedDays, table.elapsedDays, multiplier, false),
      xp: grantAmount(table.xp, table.markedDays, table.elapsedDays, multiplier, false),
    };
  }
  if (!input.endsOn || !isCalendarDate(input.endsOn) || !input.pace) {
    return null;
  }
  const daySpan = calendarDaysBetween(seoulToday(), input.endsOn);
  if (daySpan < 0) {
    return null;
  }
  const table = completionTableAmount(
    input.difficulty,
    daySpan,
    daySpan + 1,
    input.pace === 'once' ? 'once' : 'steady',
  );
  return {
    days: input.pace === 'steady' ? table.elapsedDays : undefined,
    gold: grantAmount(table.gold, table.markedDays, table.elapsedDays, multiplier, false),
    xp: grantAmount(table.xp, table.markedDays, table.elapsedDays, multiplier, false),
  };
}

export function rewardBreakdown(gold: number, applied: QuestRewardApplied): RewardBreakdown {
  const tags: RewardTag[] = [];
  if (applied.jobMultiplier !== 1) {
    tags.push({ type: 'job', multiplier: applied.jobMultiplier });
  }
  if (applied.comboMultiplier !== 1) {
    tags.push({ type: 'combo', multiplier: applied.comboMultiplier });
  }
  if (applied.noteBonus) {
    tags.push({ type: 'note', multiplier: NOTE_MULTIPLIER });
  }
  if (applied.critMultiplier > 1) {
    tags.push({ type: 'crit', multiplier: applied.critMultiplier });
  }

  const partial = applied.elapsedDays > 0 && applied.markedDays < applied.elapsedDays;
  const receipt: RewardReceipt | null = partial
    ? {
        baseGold: applied.baseGold,
        markedDays: applied.markedDays,
        elapsedDays: applied.elapsedDays,
        ratio: Math.round((applied.markedDays / applied.elapsedDays) * 100) / 100,
      }
    : null;

  return {
    tags,
    receipt,
    showBaseGold: receipt === null && gold !== applied.baseGold,
    baseGold: applied.baseGold,
    crit: applied.critMultiplier,
  };
}
