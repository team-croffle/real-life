import type { Progress, QuestPenaltySettlement, Stats, WalletBalance } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getStats(): Promise<Stats> {
  return apiFetch<Stats>('/stats');
}

export function getWallet(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet');
}

export function getProgress(): Promise<Progress> {
  return apiFetch<Progress>('/progress');
}

export function settleQuestPenalties(signal?: AbortSignal): Promise<QuestPenaltySettlement> {
  return apiFetch<QuestPenaltySettlement>('/quest-penalties/settle', { method: 'POST', signal });
}
