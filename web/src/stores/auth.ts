import type {
  GoogleAuthPayload,
  GoogleAuthResult,
  GoogleOnboardingPayload,
  LoginPayload,
  LoginResult,
  RegisterPayload,
  RegisterResult,
  User,
} from '@nest-vue/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import {
  clearAuthFlow,
  loadAuthFlow,
  saveAuthFlow,
  type EmailRegisterDraft,
} from '@/auth/authFlowStorage';
import { clearAccessToken, getAccessToken, setAccessToken } from '@/auth/authTokens';
import { ApiError, apiFetch } from '@/composables/useApi';
import { decodeGoogleNickname } from '@/composables/useGoogleAuth';

export type { EmailRegisterDraft };

let hydratePromise: Promise<void> | null = null;
let hydrated = false;

async function resendVerification(email: string): Promise<void> {
  await apiFetch<void>('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export const useAuthStore = defineStore('auth', () => {
  const storedFlow = loadAuthFlow();
  const user = ref<User | null>(null);
  const justOnboarded = ref(false);
  const pending = ref(false);
  const emailDraft = ref<EmailRegisterDraft | null>(storedFlow.emailDraft);
  const googleOnboardingToken = ref<string | null>(storedFlow.googleOnboardingToken);
  const googleNicknamePrefill = ref(storedFlow.googleNicknamePrefill);
  const pendingEmail = ref<string | null>(storedFlow.pendingEmail);
  const devVerifyToken = ref<string | null>(storedFlow.devVerifyToken);
  const hasTokens = ref(false);

  const isAuthenticated = computed(() => user.value !== null);
  const hasJobAccess = computed(
    () => emailDraft.value !== null || googleOnboardingToken.value !== null,
  );

  function persistFlow(): void {
    const draft = emailDraft.value;
    saveAuthFlow({
      emailDraft: draft ? { nickname: draft.nickname, email: draft.email, password: '' } : null,
      googleOnboardingToken: googleOnboardingToken.value,
      googleNicknamePrefill: googleNicknamePrefill.value,
      pendingEmail: pendingEmail.value,
      devVerifyToken: devVerifyToken.value,
    });
  }

  function applyLoginResult(result: LoginResult): void {
    setAccessToken(result.accessToken);
    hasTokens.value = true;
    user.value = result.user;
  }

  function clearJustOnboarded(): void {
    justOnboarded.value = false;
  }

  function clearDraft(): void {
    emailDraft.value = null;
    googleOnboardingToken.value = null;
    googleNicknamePrefill.value = '';
    persistFlow();
  }

  function clearPendingEmail(): void {
    pendingEmail.value = null;
    devVerifyToken.value = null;
    persistFlow();
  }

  function clearSession(): void {
    user.value = null;
    justOnboarded.value = false;
    clearAccessToken();
    hasTokens.value = false;
  }

  function saveEmailDraft(draft: EmailRegisterDraft): void {
    emailDraft.value = draft;
    googleOnboardingToken.value = null;
    googleNicknamePrefill.value = '';
    persistFlow();
  }

  function setGoogleOnboarding(token: string, nickname = ''): void {
    googleOnboardingToken.value = token;
    googleNicknamePrefill.value = nickname;
    emailDraft.value = null;
    persistFlow();
  }

  function setPendingEmail(email: string, token?: string): void {
    pendingEmail.value = email;
    devVerifyToken.value = token ?? null;
    persistFlow();
  }

  async function hydrate(): Promise<void> {
    if (hydrated) {
      return;
    }

    if (!hydratePromise) {
      hydratePromise = (async () => {
        try {
          if (!getAccessToken()) {
            const refreshed = await apiFetch<LoginResult>('/auth/refresh', { method: 'POST' });
            applyLoginResult(refreshed);
          }
          user.value = await apiFetch<User>('/auth/me');
          hasTokens.value = true;
          hydrated = true;
        } catch (error) {
          if (isUnauthorized(error)) {
            clearSession();
            hydrated = true;
            return;
          }

          // access가 있을 때만 앱에 남긴다. 게스트 5xx를 로그인된 것처럼 보지 않는다.
          hasTokens.value = Boolean(getAccessToken());
          hydratePromise = null;
        }
      })();
    }

    await hydratePromise;
  }

  async function login(payload: LoginPayload): Promise<void> {
    pending.value = true;
    try {
      const result = await apiFetch<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      applyLoginResult(result);
      justOnboarded.value = false;
      clearDraft();
      clearPendingEmail();
    } finally {
      pending.value = false;
    }
  }

  async function register(payload: RegisterPayload): Promise<RegisterResult> {
    pending.value = true;
    try {
      const result = await apiFetch<RegisterResult>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setPendingEmail(result.email, result.devVerifyToken);
      clearDraft();
      return result;
    } finally {
      pending.value = false;
    }
  }

  async function verifyEmail(token: string): Promise<void> {
    pending.value = true;
    try {
      const result = await apiFetch<LoginResult>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      applyLoginResult(result);
      justOnboarded.value = true;
      clearPendingEmail();
    } finally {
      pending.value = false;
    }
  }

  async function loginWithGoogle(idToken: string): Promise<{ needsOnboarding: boolean }> {
    pending.value = true;
    try {
      const result = await apiFetch<GoogleAuthResult>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken } satisfies GoogleAuthPayload),
      });

      if (result.needsOnboarding) {
        setGoogleOnboarding(result.onboardingToken, decodeGoogleNickname(idToken));
        return { needsOnboarding: true };
      }

      applyLoginResult(result);
      justOnboarded.value = false;
      clearDraft();
      clearPendingEmail();
      return { needsOnboarding: false };
    } finally {
      pending.value = false;
    }
  }

  async function completeGoogleOnboarding(
    payload: Omit<GoogleOnboardingPayload, 'onboardingToken'>,
  ): Promise<void> {
    const onboardingToken = googleOnboardingToken.value;
    if (!onboardingToken) {
      throw new Error('Missing Google onboarding token');
    }

    pending.value = true;
    try {
      const result = await apiFetch<LoginResult>('/auth/google/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          onboardingToken,
          ...payload,
        } satisfies GoogleOnboardingPayload),
      });
      applyLoginResult(result);
      justOnboarded.value = true;
      clearDraft();
      clearPendingEmail();
    } finally {
      pending.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
    } catch {
      // 로컬 세션은 항상 지운다.
    } finally {
      clearSession();
      clearDraft();
      clearPendingEmail();
      clearAuthFlow();
    }
  }

  return {
    user,
    justOnboarded,
    pending,
    emailDraft,
    googleOnboardingToken,
    googleNicknamePrefill,
    pendingEmail,
    devVerifyToken,
    hasTokens,
    isAuthenticated,
    hasJobAccess,
    applyLoginResult,
    clearJustOnboarded,
    clearDraft,
    clearSession,
    saveEmailDraft,
    setGoogleOnboarding,
    setPendingEmail,
    hydrate,
    login,
    register,
    verifyEmail,
    resendVerification,
    loginWithGoogle,
    completeGoogleOnboarding,
    logout,
  };
});
