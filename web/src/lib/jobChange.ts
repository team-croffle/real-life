import type { JobChangeResult, JobChangeStatus, JobClass } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getJobChangeStatus(): Promise<JobChangeStatus> {
  return apiFetch<JobChangeStatus>('/job-class');
}

export function changeJobClass(jobClass: JobClass): Promise<JobChangeResult> {
  return apiFetch<JobChangeResult>('/job-class', {
    method: 'POST',
    body: JSON.stringify({ jobClass }),
  });
}
