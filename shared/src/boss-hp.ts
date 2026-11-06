import { QUEST_DIFFICULTY_SCORES } from './constants/quests';
import type { QuestDifficulty } from './constants/quests';

/** 횟수는 서버가 확정일의 서울 날짜로 센다. 이 함수는 그 횟수에 점수만 곱한다. */
export function bossQuestHp(times: number, difficulty: QuestDifficulty): number {
  return times * QUEST_DIFFICULTY_SCORES[difficulty];
}
