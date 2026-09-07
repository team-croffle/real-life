import type { JobClass } from '../constants/jobs';
import type { User } from './user';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nickname: string;
  jobClass: JobClass;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export interface WithdrawPayload {
  confirm: true;
  password?: string;
  idToken?: string;
}

export interface GoogleAuthPayload {
  idToken: string;
}

export type GoogleAuthResult =
  | ({ needsOnboarding: false } & LoginResult)
  | { needsOnboarding: true; onboardingToken: string };

export interface GoogleOnboardingPayload {
  onboardingToken: string;
  nickname: string;
  jobClass: JobClass;
}
