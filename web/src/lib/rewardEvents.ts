import type { CurrentRewardEvent } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export async function getCurrentRewardEvent(): Promise<CurrentRewardEvent | null> {
  const current = await apiFetch<CurrentRewardEvent | undefined>('/reward-events/current');
  return current ?? null;
}

export function formatEventMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
