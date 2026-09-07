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

export interface RegisterResult {
  email: string;
  needsEmailVerification: true;
  /** development + SMTP 없음일 때만. 로그에 링크를 남기지 않는다. */
  devVerifyToken?: string;
}

export interface VerifyEmailPayload {
  token: string;
}

export interface ResendVerificationPayload {
  email: string;
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
