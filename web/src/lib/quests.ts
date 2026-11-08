import type {
  CreateQuestPayload,
  CreateRoutinePayload,
  Quest,
  QuestCompletionResult,
  QuestDayMarkResult,
  QuestListItem,
  Routine,
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

export async function getRoutines(): Promise<Routine[]> {
  return apiFetch<Routine[]>('/routines');
}

export async function createRoutine(payload: CreateRoutinePayload): Promise<Routine> {
  return apiFetch<Routine>('/routines', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRoutine(
  routineId: string,
  payload: Partial<CreateRoutinePayload>,
): Promise<Routine> {
  return apiFetch<Routine>(`/routines/${routineId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function pauseRoutine(routineId: string): Promise<Routine> {
  return apiFetch<Routine>(`/routines/${routineId}/pause`, { method: 'POST' });
}

export async function resumeRoutine(routineId: string): Promise<Routine> {
  return apiFetch<Routine>(`/routines/${routineId}/resume`, { method: 'POST' });
}

export async function deleteRoutine(routineId: string): Promise<void> {
  await apiFetch<void>(`/routines/${routineId}`, { method: 'DELETE' });
}
