import type {
  CreateQuestPayload,
  Quest,
  QuestCompletionResult,
  QuestDayMarkResult,
  QuestListItem,
  QuestRoutineRestResult,
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

export async function restQuest(questId: string): Promise<QuestRoutineRestResult> {
  return apiFetch<QuestRoutineRestResult>(`/quests/${questId}/rest`, { method: 'POST' });
}

export async function resumeQuest(questId: string): Promise<QuestRoutineRestResult> {
  return apiFetch<QuestRoutineRestResult>(`/quests/${questId}/resume`, { method: 'POST' });
}
