export const QUEST_KINDS = ['general', 'main'] as const;

export type QuestKind = (typeof QUEST_KINDS)[number];

export const QUEST_KIND_LABELS: Record<QuestKind, string> = {
  general: '일반',
  main: '메인',
};

export const QUEST_SCHEDULES = ['routine', 'deadline'] as const;

export type QuestSchedule = (typeof QUEST_SCHEDULES)[number];

export const QUEST_SCHEDULE_LABELS: Record<QuestSchedule, string> = {
  routine: '루틴',
  deadline: '마감',
};

export const QUEST_CATEGORIES = ['exercise', 'life', 'study', 'work', 'creation', 'mind'] as const;

export type QuestCategory = (typeof QUEST_CATEGORIES)[number];

export const QUEST_CATEGORY_LABELS: Record<QuestCategory, string> = {
  exercise: '운동',
  life: '생활',
  study: '학습',
  work: '업무',
  creation: '창작',
  mind: '마음',
};

export const QUEST_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export type QuestDifficulty = (typeof QUEST_DIFFICULTIES)[number];

export const QUEST_DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
};

export const QUEST_WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type QuestWeekday = (typeof QUEST_WEEKDAYS)[number];

export const QUEST_WEEKDAY_LABELS: Record<QuestWeekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

/** 카테고리별 제목 템플릿. 사용자는 목록을 CRUD하지 않는다. */
export const QUEST_TITLE_TEMPLATES: Record<QuestCategory, readonly string[]> = {
  exercise: ['스트레칭 10분', '걷기 30분'],
  life: ['설거지 끝내기', '방 정리 15분'],
  study: ['독서 20분', '공부 1시간'],
  work: ['할 일 한 건 처리', '집중 25분'],
  creation: ['그림·악기 30분', '짧은 글 한 편'],
  mind: ['일기 쓰기', '10분 쉬기'],
};

export const QUEST_REWARD_PERIODS = ['daily', 'weekly', 'long_term'] as const;

export type QuestRewardPeriod = (typeof QUEST_REWARD_PERIODS)[number];

export const QUEST_REWARD_PERIOD_LABELS: Record<QuestRewardPeriod, string> = {
  daily: '일일',
  weekly: '주간',
  long_term: '장기',
};

/** 명세 3.3 초안. 지급은 feat/quest-complete-server */
export const QUEST_REWARDS: Record<
  QuestDifficulty,
  Record<QuestRewardPeriod, { gold: number; xp: number }>
> = {
  easy: {
    daily: { gold: 10, xp: 10 },
    weekly: { gold: 30, xp: 30 },
    long_term: { gold: 50, xp: 50 },
  },
  normal: {
    daily: { gold: 20, xp: 20 },
    weekly: { gold: 50, xp: 50 },
    long_term: { gold: 100, xp: 100 },
  },
  hard: {
    daily: { gold: 30, xp: 30 },
    weekly: { gold: 80, xp: 80 },
    long_term: { gold: 150, xp: 150 },
  },
};

/** 마감 남은 일수 0(오늘 자정까지) = 일일 열 */
export const QUEST_DEADLINE_DAILY_REMAINING_DAYS = 0;

/** 마감 남은 일수 1~이 값 = 주간 열. 더 크면 장기 */
export const QUEST_DEADLINE_WEEKLY_MAX_REMAINING_DAYS = 7;
