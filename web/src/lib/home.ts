import type { Stats, WalletBalance } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getStats(): Promise<Stats> {
  return apiFetch<Stats>('/stats');
}

export function getWallet(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet');
}
