import type { QuestDifficulty } from './quests';

/** 명세 3.5. 루틴 미달 하루, 퀘스트 하나의 차감액 */
export const QUEST_PENALTIES: Record<QuestDifficulty, { gold: number; xp: number }> = {
  easy: { gold: 5, xp: 5 },
  normal: { gold: 10, xp: 10 },
  hard: { gold: 20, xp: 20 },
};
