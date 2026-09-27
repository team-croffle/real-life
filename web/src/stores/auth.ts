import type {
  CompleteOnboardingPayload,
  LoginPayload,
  RegisterPayload,
  RegisterResult,
  User,
} from '@nest-vue/shared';
import { isJobClass, isUserRole } from '@nest-vue/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { authClient } from '@/auth/authClient';
import { clearAuthFlow, loadAuthFlow, saveAuthFlow } from '@/auth/authFlowStorage';
import { ApiError, apiFetch } from '@/composables/useApi';

let hydratePromise: Promise<void> | null = null;

function mapSessionUser(value: Record<string, unknown>): User {
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;

  return {
    id: String(value.id),
    email: String(value.email ?? ''),
    nickname: String(value.nickname ?? value.name ?? ''),
    tag: String(value.tag ?? ''),
    jobClass: isJobClass(value.jobClass) ? value.jobClass : null,
    role: isUserRole(value.role) ? value.role : 'member',
    emailVerified: Boolean(value.emailVerified),
    createdAt: createdAt instanceof Date ? createdAt.toISOString() : String(createdAt ?? ''),
    updatedAt: updatedAt instanceof Date ? updatedAt.toISOString() : String(updatedAt ?? ''),
  };
}

function throwClientError(error: { status?: number; message?: string; code?: string }): never {
  const code = error.code ?? '';
  if (code === 'EMAIL_NOT_VERIFIED') {
    throw new ApiError(403, 'Email not verified');
  }
  if (code === 'USER_ALREADY_EXISTS') {
    throw new ApiError(409, 'Email already registered');
  }
  if (code === 'INVALID_EMAIL_OR_PASSWORD' || error.status === 401) {
    throw new ApiError(401, 'Unauthorized');
  }
  throw new ApiError(error.status ?? 400, error.message ?? 'Unauthorized');
}

async function resendVerification(email: string): Promise<void> {
  await apiFetch<void>('/account/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export const useAuthStore = defineStore('auth', () => {
  const storedFlow = loadAuthFlow();
  const user = ref<User | null>(null);
  const justOnboarded = ref(storedFlow.justOnboarded);
  const pending = ref(false);
  const googleNicknamePrefill = ref(storedFlow.googleNicknamePrefill);
  const pendingEmail = ref<string | null>(storedFlow.pendingEmail);

  const isAuthenticated = computed(() => user.value !== null);
  const needsJobOnboarding = computed(() => user.value !== null && user.value.jobClass === null);

  function persistFlow(): void {
    saveAuthFlow({
      googleNicknamePrefill: googleNicknamePrefill.value,
      pendingEmail: pendingEmail.value,
      justOnboarded: justOnboarded.value,
    });
  }

  function applyUser(next: User | null): void {
    user.value = next;
  }

  function clearJustOnboarded(): void {
    justOnboarded.value = false;
    persistFlow();
  }

  function clearDraft(): void {
    googleNicknamePrefill.value = '';
    persistFlow();
  }

  function clearPendingEmail(): void {
    pendingEmail.value = null;
    persistFlow();
  }

  function clearSession(): void {
    user.value = null;
    justOnboarded.value = false;
    persistFlow();
  }

  function setPendingEmail(email: string): void {
    pendingEmail.value = email;
    persistFlow();
  }

  async function readSession(): Promise<User | null | 'unavailable'> {
    const result = await authClient.getSession();
    if (result.error) {
      return 'unavailable';
    }
    if (!result.data?.user) {
      return null;
    }
    return mapSessionUser(result.data.user as unknown as Record<string, unknown>);
  }

  async function readSessionWithRetry(): Promise<User | null | 'unavailable'> {
    const first = await readSession();
    if (first !== 'unavailable') {
      return first;
    }
    return readSession();
  }

  async function requireSessionUser(): Promise<User> {
    const next = await readSessionWithRetry();
    if (next === 'unavailable' || next === null) {
      throw new ApiError(401, 'Unauthorized');
    }
    return next;
  }

  async function hydrate(): Promise<void> {
    if (!hydratePromise) {
      hydratePromise = (async () => {
        try {
          const next = await readSessionWithRetry();
          if (next === 'unavailable') {
            return;
          }
          applyUser(next);
        } finally {
          hydratePromise = null;
        }
      })();
    }

    return hydratePromise;
  }

  async function login(payload: LoginPayload): Promise<void> {
    pending.value = true;
    try {
      const result = await authClient.signIn.email({
        email: payload.email,
        password: payload.password,
      });
      if (result.error) {
        throwClientError(result.error);
      }
      applyUser(await requireSessionUser());
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
      const result = await apiFetch<RegisterResult>('/account/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setPendingEmail(result.email);
      clearDraft();
      return result;
    } finally {
      pending.value = false;
    }
  }

  async function verifyEmail(token: string): Promise<void> {
    pending.value = true;
    try {
      const result = await authClient.verifyEmail({
        query: { token },
      });
      if (result.error) {
        throwClientError({ ...result.error, status: result.error.status ?? 401 });
      }
      applyUser(await requireSessionUser());
      justOnboarded.value = false;
      clearPendingEmail();
    } finally {
      pending.value = false;
    }
  }

  async function loginWithGoogle(idToken: string): Promise<{ needsOnboarding: boolean }> {
    pending.value = true;
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        idToken: { token: idToken },
      });
      if (result.error) {
        throwClientError(result.error);
      }
      const next = await requireSessionUser();
      applyUser(next);
      const needsOnboarding = next.jobClass === null;
      if (needsOnboarding) {
        googleNicknamePrefill.value = next.nickname ?? '';
        persistFlow();
      } else {
        justOnboarded.value = false;
        clearDraft();
        clearPendingEmail();
      }
      return { needsOnboarding };
    } finally {
      pending.value = false;
    }
  }

  async function completeOnboarding(payload: CompleteOnboardingPayload): Promise<void> {
    pending.value = true;
    try {
      const next = await apiFetch<User>('/account/onboarding', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      applyUser(next);
      justOnboarded.value = true;
      clearDraft();
      clearPendingEmail();
    } finally {
      pending.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authClient.signOut();
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
    googleNicknamePrefill,
    pendingEmail,
    isAuthenticated,
    needsJobOnboarding,
    clearJustOnboarded,
    clearDraft,
    clearSession,
    setPendingEmail,
    hydrate,
    login,
    register,
    verifyEmail,
    resendVerification,
    loginWithGoogle,
    completeOnboarding,
    logout,
  };
});
