import type { MonsterStatus } from '../constants/monsters';
import type { QuestCategory, QuestDifficulty, QuestWeekday } from '../constants/quests';
import type { QuestMonster } from './quest';

/** POST /api/v1/routines */
export interface CreateRoutinePayload {
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  weekdays: QuestWeekday[];
  biweekly: boolean;
}

/** GET /api/v1/routines 와 보스 확정 응답의 하위 루틴. */
export interface Routine {
  id: string;
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  weekdays: QuestWeekday[];
  biweekly: boolean;
  active: boolean;
  bossId: string | null;
  createdAt: string;
  monsterStatus: MonsterStatus | null;
  monster: QuestMonster | null;
}
