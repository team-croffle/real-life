import type { Paginated, WalletBalance, WalletEntry } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getWallet(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet');
}

export function getWalletEntries(page: number): Promise<Paginated<WalletEntry>> {
  const params = new URLSearchParams({ page: String(page) });
  return apiFetch<Paginated<WalletEntry>>(`/wallet/entries?${params}`);
}
