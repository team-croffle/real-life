import type {
  CreateQuestPayload,
  Quest,
  QuestCompletionResult,
  QuestDayMarkResult,
  QuestListItem,
} from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export type { QuestListItem };

export async function getQuests(): Promise<QuestListItem[]> {
  return apiFetch<QuestListItem[]>('/quests');
}

export async function createQuest(payload: CreateQuestPayload): Promise<Quest> {
  return apiFetch<Quest>('/quests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function completeQuest(
  questId: string,
  note?: string,
): Promise<QuestCompletionResult> {
  const trimmed = note?.trim() ?? '';
  return apiFetch<QuestCompletionResult>(`/quests/${questId}/complete`, {
    method: 'POST',
    body: JSON.stringify(trimmed ? { note: trimmed } : {}),
  });
}

export async function markQuestToday(questId: string): Promise<QuestDayMarkResult> {
  return apiFetch<QuestDayMarkResult>(`/quests/${questId}/day-marks`, { method: 'POST' });
}

export async function abandonQuest(questId: string): Promise<void> {
  await apiFetch<void>(`/quests/${questId}`, { method: 'DELETE' });
}
