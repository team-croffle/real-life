import type { MonsterKind, MonsterStatus } from '../constants/monsters';
import type { QuestCategory, QuestDifficulty, QuestPace } from '../constants/quests';

/** 기한 퀘스트. 골드·경험치는 등록 응답의 예상 금액이다. */
export interface Quest {
  id: string;
  userId: string;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  pace: QuestPace;
  endsOn: string;
  gold: number;
  xp: number;
  bossId: string | null;
  routineId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuestMonster {
  kind: MonsterKind;
  imageKey: string;
  name: string;
  description: string;
}

/** GET /api/quests. 골드·경험치는 수행 내용 없이 오늘 완료한다고 본 지급액이다. */
export interface QuestListItem {
  id: string;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  pace: QuestPace;
  endsOn: string;
  /** 한국 달력 날짜 `YYYY-MM-DD` */
  createdOn: string;
  /** 루틴이 찍은 퀘스트만. 아니면 null */
  routineId: string | null;
  dueToday: boolean;
  completedToday: boolean;
  completed: boolean;
  canComplete: boolean;
  canAbandon: boolean;
  canMarkToday: boolean;
  /** day-mark가 없으면 0 */
  markedDayCount: number;
  markedToday: boolean;
  /** 오늘이 마감 기간 밖이면 null. 기간 안이면 만든 날과 오늘을 포함한다 */
  elapsedDays: number | null;
  /** 오늘 완료할 수 없으면 null */
  expectedGold: number | null;
  expectedXp: number | null;
  /** 작업을 넣지 않았고 몬스터도 없으면 null */
  monsterStatus: MonsterStatus | null;
  /** ready일 때만 값이 있다 */
  monster: QuestMonster | null;
  /** 보스 하위 퀘스트만. 아니면 null */
  bossId: string | null;
  /** 보스 하위 퀘스트만. 아니면 null */
  bossTitle: string | null;
}

export interface CreateQuestPayload {
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  /** 없으면 steady */
  pace?: QuestPace;
  /** 한국 달력 날짜 `YYYY-MM-DD` */
  endsOn: string;
}

export type CreateQuestResult = Quest;
