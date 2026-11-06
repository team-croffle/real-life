import type {
  DifficultyRecommendation,
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';

export type { DifficultyRecommendation };

export const AI = Symbol('AI');

export const GEMINI_MODEL_DEFAULT = 'gemini-3.5-flash-lite';

/** 이 시간을 넘기면 일반 실패로 친다. */
export const AI_CALL_TIMEOUT_MS_DEFAULT = 30_000;

/** 무료 한도에 걸렸을 때. 큐는 이때 60초 뒤에 다시 넣는다. */
export class AiRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRateLimitError';
  }
}

export type MonsterDraft = {
  title: string;
  kinds: readonly string[];
};

export type MonsterDescription = {
  kind: string;
  name: string;
  description: string;
};

export type BattleLogDraft = {
  monsterName: string;
  note: string;
};

/** 보스 마감까지의 하위 퀘스트. 횟수와 체력은 담지 않는다. */
export type SuggestedQuest = {
  title: string;
  category: QuestCategory;
  schedule: QuestSchedule;
  difficulty: QuestDifficulty;
  /** 루틴이면 null */
  pace: QuestPace | null;
  /** 기한이면 보스 마감 이하의 서울 날짜. 루틴이면 null */
  endsOn: string | null;
  /** 루틴이면 하나 이상. 기한이면 null */
  weekdays: QuestWeekday[] | null;
  /** 루틴이면 값. 기한이면 null */
  biweekly: boolean | null;
};

export type QuestPlanDraft = {
  goal: string;
  /** 보스 마감. YYYY-MM-DD */
  deadlineOn: string;
};

export interface Ai {
  describeMonster(input: MonsterDraft): Promise<MonsterDescription>;
  writeBattleLog(input: BattleLogDraft, timeoutMs?: number): Promise<string>;
  recommendDifficulty(input: { title: string }): Promise<DifficultyRecommendation>;
  suggestPlan(input: QuestPlanDraft): Promise<SuggestedQuest[]>;
}
