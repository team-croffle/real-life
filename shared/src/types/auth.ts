import type { JobClass } from '../constants/jobs';
import type { User } from './user';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
}

export interface RegisterResult {
  email: string;
  needsEmailVerification: true;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface WithdrawPayload {
  confirm: true;
  password?: string;
  idToken?: string;
}

export interface CompleteOnboardingPayload {
  nickname: string;
  jobClass: JobClass;
}

export type { User };
