import type { WalletBalance } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getWallet(): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/wallet');
}
