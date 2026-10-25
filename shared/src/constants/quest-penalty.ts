import type { QuestDifficulty, QuestRewardPeriod } from './quests';

/** 명세 3.5. 루틴 미달 하루, 퀘스트 하나의 차감액 */
export const QUEST_PENALTIES: Record<QuestDifficulty, { gold: number; xp: number }> = {
  easy: { gold: 5, xp: 5 },
  normal: { gold: 10, xp: 10 },
  hard: { gold: 20, xp: 20 },
};

/** 명세 3.5. 기한 퀘스트 하나의 차감액. 열은 만든 날부터 마감일까지의 간격으로 고른다. */
export const QUEST_DEADLINE_PENALTIES: Record<
  QuestDifficulty,
  Record<QuestRewardPeriod, { gold: number; xp: number }>
> = {
  easy: {
    daily: { gold: 5, xp: 5 },
    weekly: { gold: 10, xp: 10 },
    long_term: { gold: 15, xp: 15 },
  },
  normal: {
    daily: { gold: 10, xp: 10 },
    weekly: { gold: 20, xp: 20 },
    long_term: { gold: 30, xp: 30 },
  },
  hard: {
    daily: { gold: 20, xp: 20 },
    weekly: { gold: 40, xp: 40 },
    long_term: { gold: 60, xp: 60 },
  },
};
