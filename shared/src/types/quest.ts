import type {
  QuestCategory,
  QuestDifficulty,
  QuestKind,
  QuestPace,
  QuestSchedule,
  QuestWeekday,
} from '../constants/quests';

interface QuestFields {
  id: string;
  userId: string;
  kind: QuestKind;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  gold: number;
  xp: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineQuest extends QuestFields {
  schedule: 'routine';
  pace: null;
  weekdays: QuestWeekday[];
  biweekly: boolean;
  endsOn: null;
  /** 쉬는 첫 날 `YYYY-MM-DD`. 켜져 있으면 null */
  restFrom: string | null;
  /** 쉬는 마지막 날. 아직 꺼져 있으면 null */
  restUntil: string | null;
}

export interface DeadlineQuest extends QuestFields {
  schedule: 'deadline';
  /** 꾸준히 또는 한 번에. 요청에 없으면 steady로 저장된다 */
  pace: QuestPace;
  weekdays: null;
  biweekly: null;
  endsOn: string;
  restFrom: null;
  restUntil: null;
}

export type Quest = RoutineQuest | DeadlineQuest;

/** GET /api/quests. 골드·경험치는 수행 내용 없이 오늘 완료한다고 본 지급액이다. */
export interface QuestListItem {
  id: string;
  kind: QuestKind;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  schedule: QuestSchedule;
  /** 기한은 steady | once. 루틴은 null */
  pace: QuestPace | null;
  weekdays: QuestWeekday[] | null;
  biweekly: boolean | null;
  endsOn: string | null;
  /** 쉬는 첫 날. 기한과 켜진 루틴은 null */
  restFrom: string | null;
  /** 쉬는 마지막 날. 아직 꺼진 루틴과 기한은 null */
  restUntil: string | null;
  /** 한국 달력 날짜 `YYYY-MM-DD` */
  createdOn: string;
  dueToday: boolean;
  completedToday: boolean;
  completed: boolean;
  canComplete: boolean;
  canAbandon: boolean;
  canMarkToday: boolean;
  /** 루틴은 null. 마감은 day-mark가 없으면 0 */
  markedDayCount: number | null;
  /** 루틴은 null */
  markedToday: boolean | null;
  /** 루틴, 또는 오늘이 마감 기간 밖이면 null. 기간 안이면 만든 날과 오늘을 포함한다 */
  elapsedDays: number | null;
  /** 오늘 완료할 수 없는 마감은 null. 루틴은 일일 금액 */
  expectedGold: number | null;
  expectedXp: number | null;
}

interface CreateQuestFields {
  kind: QuestKind;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
}

export interface CreateRoutineQuestPayload extends CreateQuestFields {
  schedule: 'routine';
  weekdays: QuestWeekday[];
  biweekly: boolean;
}

export interface CreateDeadlineQuestPayload extends CreateQuestFields {
  schedule: 'deadline';
  /** 없으면 steady */
  pace?: QuestPace;
  /** 한국 달력 날짜 `YYYY-MM-DD` */
  endsOn: string;
}

export type CreateQuestPayload = CreateRoutineQuestPayload | CreateDeadlineQuestPayload;

export type CreateQuestResult = Quest;

/** POST /api/quests/:id/rest 와 POST /api/quests/:id/resume */
export interface QuestRoutineRestResult {
  id: string;
  restFrom: string | null;
  restUntil: string | null;
  dueToday: boolean;
}
