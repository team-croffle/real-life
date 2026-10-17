import type { Progress, QuestPenaltySettlement } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getProgress(): Promise<Progress> {
  return apiFetch<Progress>('/progress');
}

export function settleQuestPenalties(signal?: AbortSignal): Promise<QuestPenaltySettlement> {
  return apiFetch<QuestPenaltySettlement>('/quest-penalties/settle', { method: 'POST', signal });
}
