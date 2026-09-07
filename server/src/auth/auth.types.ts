import type { AuthProvider } from '@nest-vue/shared';

export type AccessTokenPayload = {
  sub: string;
  typ: 'access';
  /** refresh_tokens.id — guard rejects if that row is revoked or gone */
  sid: string;
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
};

export type OnboardingTokenPayload = {
  typ: 'onboarding';
  provider: AuthProvider;
  subject: string;
  email: string;
};

export type RequestAuthUser = {
  id: string;
};
