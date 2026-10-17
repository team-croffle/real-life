import type { Stats } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getStats(): Promise<Stats> {
  return apiFetch<Stats>('/stats');
}
