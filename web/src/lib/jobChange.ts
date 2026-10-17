import type { JobChangeStatus } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getJobChangeStatus(): Promise<JobChangeStatus> {
  return apiFetch<JobChangeStatus>('/job-class');
}
