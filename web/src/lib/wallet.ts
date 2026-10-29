import type { Paginated, WalletBalance, WalletEntry } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getWallet(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet');
}

export function getWalletEntries(page: number): Promise<Paginated<WalletEntry>> {
  const params = new URLSearchParams({ page: String(page) });
  return apiFetch<Paginated<WalletEntry>>(`/wallet/entries?${params}`);
}

/** 받은 보상을 스스로 돌려놓는다. 외상 한도를 넘으면 서버가 400을 준다. */
export function createPostHocDeduction(amount: number): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet/post-hoc-deductions', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
