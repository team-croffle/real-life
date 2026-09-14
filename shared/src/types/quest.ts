import type { QuestCategory, QuestDifficulty, QuestKind, QuestWeekday } from '../constants/quests';

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
  weekdays: QuestWeekday[];
  biweekly: boolean;
  endsOn: null;
}

export interface DeadlineQuest extends QuestFields {
  schedule: 'deadline';
  weekdays: null;
  biweekly: null;
  endsOn: string;
}

export type Quest = RoutineQuest | DeadlineQuest;

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
  /** 한국 달력 날짜 `YYYY-MM-DD` */
  endsOn: string;
}

export type CreateQuestPayload = CreateRoutineQuestPayload | CreateDeadlineQuestPayload;

export type CreateQuestResult = Quest;
