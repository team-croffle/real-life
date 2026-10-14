import type {
  CreateQuestPayload,
  Quest,
  QuestCategory,
  QuestCompletionResult,
  QuestDifficulty,
  QuestKind,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import { QUEST_WEEKDAYS } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';
import { addCalendarDays, seoulToday, seoulWeekday } from '@/lib/questReward';

/** 목록 API가 생기기 전까지 화면이 쓰는 항목. target/done은 서버 필드가 아니다. */
export interface QuestListItem {
  id: string;
  kind: QuestKind;
  category: QuestCategory;
  title: string;
  difficulty: QuestDifficulty;
  schedule: QuestSchedule;
  weekdays: QuestWeekday[] | null;
  biweekly: boolean | null;
  endsOn: string | null;
  target: boolean;
  done: boolean;
}

let quests: QuestListItem[] | null = null;

/** 목록 조회 API가 없다. 이 함수 안에서만 임시 데이터를 만든다. */
export async function getQuests(): Promise<QuestListItem[]> {
  // TODO(server: list API)
  return ensureQuests().map(cloneQuest);
}

export async function createQuest(payload: CreateQuestPayload): Promise<Quest> {
  const quest = await apiFetch<Quest>('/quests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const items = ensureQuests();
  items.unshift(toListItem(quest));
  return quest;
}

export async function completeQuest(questId: string): Promise<QuestCompletionResult> {
  const result = await apiFetch<QuestCompletionResult>(`/quests/${questId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  const item = ensureQuests().find((quest) => quest.id === questId);
  if (item) {
    item.done = true;
  }
  return result;
}

export async function abandonQuest(questId: string): Promise<void> {
  await apiFetch<void>(`/quests/${questId}`, { method: 'DELETE' });
  quests = ensureQuests().filter((quest) => quest.id !== questId);
}

function ensureQuests(): QuestListItem[] {
  quests ??= seedQuests();
  return quests;
}

function seedQuests(): QuestListItem[] {
  const today = seoulWeekday();
  const otherDay = QUEST_WEEKDAYS.find((weekday) => weekday !== today) ?? 'mon';

  return [
    {
      id: 'placeholder-today',
      kind: 'general',
      category: 'exercise',
      title: '스트레칭 10분',
      difficulty: 'easy',
      schedule: 'routine',
      weekdays: [today],
      biweekly: false,
      endsOn: null,
      target: true,
      done: false,
    },
    {
      id: 'placeholder-done',
      kind: 'general',
      category: 'study',
      title: '공부 1시간',
      difficulty: 'normal',
      schedule: 'routine',
      weekdays: [today],
      biweekly: false,
      endsOn: null,
      target: true,
      done: true,
    },
    {
      id: 'placeholder-later',
      kind: 'general',
      category: 'life',
      title: '방 정리 15분',
      difficulty: 'easy',
      schedule: 'routine',
      weekdays: [otherDay],
      biweekly: false,
      endsOn: null,
      target: false,
      done: false,
    },
    {
      id: 'placeholder-deadline',
      kind: 'main',
      category: 'work',
      title: '할 일 한 건 처리',
      difficulty: 'hard',
      schedule: 'deadline',
      weekdays: null,
      biweekly: null,
      endsOn: addCalendarDays(seoulToday(), 10),
      target: false,
      done: false,
    },
  ];
}

function toListItem(quest: Quest): QuestListItem {
  if (quest.schedule === 'routine') {
    return {
      id: quest.id,
      kind: quest.kind,
      category: quest.category,
      title: quest.title,
      difficulty: quest.difficulty,
      schedule: 'routine',
      weekdays: [...quest.weekdays],
      biweekly: quest.biweekly,
      endsOn: null,
      // 등록한 주는 격주여도 수행 주다. 이후 쉬는 주는 목록 API가 없으면 반영하지 않는다.
      target: quest.weekdays.includes(seoulWeekday()),
      done: false,
    };
  }

  return {
    id: quest.id,
    kind: quest.kind,
    category: quest.category,
    title: quest.title,
    difficulty: quest.difficulty,
    schedule: 'deadline',
    weekdays: null,
    biweekly: null,
    endsOn: quest.endsOn,
    target: true,
    done: false,
  };
}

function cloneQuest(item: QuestListItem): QuestListItem {
  return {
    ...item,
    weekdays: item.weekdays ? [...item.weekdays] : null,
  };
}
