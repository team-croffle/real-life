import type { QuestRewardApplied } from '@nest-vue/shared';

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
