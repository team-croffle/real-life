import type { JobClass } from '../constants/jobs';

export const USER_ROLES = ['admin', 'member'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  nickname: string;
  tag: string;
  jobClass: JobClass;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
