import type { JobChangeReason } from '../constants/job-change';
import type { JobClass } from '../constants/jobs';

export interface JobChangeStatus {
  jobClass: JobClass;
  jobClassChangedAt: string | null;
  nextJobChangeAt: string | null;
}

export interface JobChangeResult {
  jobClass: JobClass;
  reason: JobChangeReason;
  level: number;
  xp: number;
  goldGranted: number;
  jobClassChangedAt: string;
  nextJobChangeAt: string;
}
