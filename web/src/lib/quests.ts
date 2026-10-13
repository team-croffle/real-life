import type {
  CreateQuestPayload,
  Quest,
  QuestCompletionResult,
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

export async function completeQuest(questId: string): Promise<QuestCompletionResult> {
  return apiFetch<QuestCompletionResult>(`/quests/${questId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function abandonQuest(questId: string): Promise<void> {
  await apiFetch<void>(`/quests/${questId}`, { method: 'DELETE' });
}
