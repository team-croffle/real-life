import type { JobClass } from '@nest-vue/shared';

const APPEARANCE_SRC_BY_JOB: Record<JobClass, string> = {
  student: '/character/cat.webp',
  office_worker: '/character/cat.webp',
  freelancer: '/character/cat.webp',
};

export function appearanceSrc(jobClass: JobClass | null | undefined): string {
  if (jobClass === null || jobClass === undefined) {
    return APPEARANCE_SRC_BY_JOB.student;
  }
  return APPEARANCE_SRC_BY_JOB[jobClass];
}
