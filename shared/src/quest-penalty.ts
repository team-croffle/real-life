import { QUEST_DEADLINE_PENALTIES } from './constants/quest-penalty';
import type { QuestDifficulty, QuestPace } from './constants/quests';
import { WALLET_DEBT_LIMIT } from './constants/wallet';
import { rewardPeriodForDaySpan } from './quest-completion';

/** 바닥은 -WALLET_DEBT_LIMIT. 남는 차감액은 버리고, 잔액은 올리지 않는다. */
export function appliedGoldPenalty(balance: number, loss: number): number {
  if (loss <= 0) {
    return 0;
  }
  const room = Math.max(0, balance + WALLET_DEBT_LIMIT);
  return Math.min(loss, room);
}

/** 현재 레벨 경험치의 0까지만 깎는다. 레벨은 바꾸지 않는다. */
export function appliedXpPenalty(levelXp: number, loss: number): number {
  if (loss <= 0) {
    return 0;
  }
  return Math.min(loss, Math.max(0, levelXp));
}

/** 만든 날부터 마감일까지의 날짜 차이로 표의 열을 고르고, 그 차감액을 돌려준다. once는 일일 열이다. */
export function deadlinePenaltyAmount(
  difficulty: QuestDifficulty,
  daySpan: number,
  pace: QuestPace = 'steady',
): { gold: number; xp: number } {
  const period = pace === 'once' ? 'daily' : rewardPeriodForDaySpan(daySpan);
  return QUEST_DEADLINE_PENALTIES[difficulty][period];
}
