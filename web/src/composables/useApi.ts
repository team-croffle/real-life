import type { ApiErrorResponse, LoginResult } from '@nest-vue/shared';
import { ref, type Ref } from 'vue';

import { getAccessToken } from '@/auth/authTokens';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/google/onboarding',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/refresh',
  '/auth/logout',
] as const;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface ApiFetchInit extends RequestInit {
  skipAuth?: boolean;
  _retried?: boolean;
}

type RefreshOutcome = 'ok' | 'unauthorized' | 'unavailable';

let refreshPromise: Promise<RefreshOutcome> | null = null;

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(
    (publicPath) => path === publicPath || path.startsWith(`${publicPath}?`),
  );
}

async function refreshSession(): Promise<RefreshOutcome> {
  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      const { useAuthStore } = await import('@/stores/auth');
      useAuthStore().clearSession();
      return 'unauthorized';
    }

    if (!response.ok) {
      return 'unavailable';
    }

    const result = (await response.json()) as LoginResult;
    const { useAuthStore } = await import('@/stores/auth');
    useAuthStore().applyLoginResult(result);
    return 'ok';
  } catch {
    return 'unavailable';
  }
}

async function ensureRefreshed(): Promise<RefreshOutcome> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        return await refreshSession();
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

/** JSON 본문을 T 로 돌려주는 fetch 래퍼. 204는 본문이 없다. */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { skipAuth, _retried, headers: initHeaders, ...rest } = init;
  const publicPath = skipAuth ?? isPublicPath(path);
  const headers = new Headers(initHeaders);

  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = getAccessToken();
  if (!publicPath && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers,
  });

  if (response.status === 401 && !_retried && !publicPath) {
    const outcome = await ensureRefreshed();
    if (outcome === 'ok') {
      return apiFetch<T>(path, { ...init, _retried: true });
    }

    if (outcome === 'unavailable') {
      throw new ApiError(503, 'Session refresh unavailable');
    }

    throw new ApiError(401, 'Unauthorized');
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? response.statusText);

    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface UseApiResult<T> {
  data: Ref<T | null>;
  error: Ref<string | null>;
  pending: Ref<boolean>;
  execute: () => Promise<void>;
}

export function useApi<T>(path: string, init?: ApiFetchInit): UseApiResult<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const error = ref<string | null>(null);
  const pending = ref(false);

  async function execute(): Promise<void> {
    pending.value = true;
    error.value = null;

    try {
      data.value = await apiFetch<T>(path, init);
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
    } finally {
      pending.value = false;
    }
  }

  return { data, error, pending, execute };
}
