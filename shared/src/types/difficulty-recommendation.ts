import type { QuestDifficulty } from '../constants/quests';

/** 등록 전 난이도 추천. 금액은 담지 않는다. */
export interface DifficultyRecommendation {
  difficulty: QuestDifficulty;
  reason: string;
}
