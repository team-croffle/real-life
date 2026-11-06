import type {
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestSchedule,
  QuestWeekday,
} from '../constants/quests';

/** POST /api/ai/quest-plans. times와 hp는 서버가 계산한다. */
export interface QuestPlanQuest {
  title: string;
  category: QuestCategory;
  schedule: QuestSchedule;
  difficulty: QuestDifficulty;
  pace: QuestPace | null;
  endsOn: string | null;
  weekdays: QuestWeekday[] | null;
  biweekly: boolean | null;
  times: number;
  hp: number;
}

export interface QuestPlan {
  quests: QuestPlanQuest[];
  totalHp: number;
}
