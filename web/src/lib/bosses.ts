import type {
  AbandonedBoss,
  BossSummary,
  ConfirmedBoss,
  Paginated,
  PastBoss,
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestPlan,
  QuestSchedule,
  QuestWeekday,
  UnseenBossResult,
} from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export type ConfirmBossQuestPayload = {
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  schedule: QuestSchedule;
  pace?: QuestPace;
  weekdays?: QuestWeekday[];
  biweekly?: boolean;
  endsOn?: string;
};

export async function getBosses(): Promise<BossSummary[]> {
  return apiFetch<BossSummary[]>('/bosses');
}

export async function getBossHistory(page: number, size: number): Promise<Paginated<PastBoss>> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiFetch<Paginated<PastBoss>>(`/bosses/history?${query}`);
}

export async function getUnseenBosses(): Promise<UnseenBossResult[]> {
  return apiFetch<UnseenBossResult[]>('/bosses/unseen');
}

export async function markBossSeen(bossId: string): Promise<void> {
  await apiFetch<void>(`/bosses/${bossId}/seen`, { method: 'POST' });
}

export async function abandonBoss(bossId: string): Promise<AbandonedBoss> {
  return apiFetch<AbandonedBoss>(`/bosses/${bossId}/abandon`, { method: 'POST' });
}

export async function retryBossMonster(bossId: string): Promise<void> {
  await apiFetch<void>(`/bosses/${bossId}/monster`, { method: 'POST' });
}

export async function suggestQuestPlan(body: {
  goal: string;
  deadlineOn: string;
}): Promise<QuestPlan> {
  return apiFetch<QuestPlan>('/ai/quest-plans', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function confirmBoss(payload: {
  goal: string;
  category: QuestCategory;
  deadlineOn: string;
  quests: ConfirmBossQuestPayload[];
}): Promise<ConfirmedBoss> {
  return apiFetch<ConfirmedBoss>('/bosses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
