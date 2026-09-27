import type { ApiErrorResponse } from '@nest-vue/shared';
import { ref, type Ref } from 'vue';

import { apiBaseUrl } from '@/lib/apiBase';

const BASE_URL = apiBaseUrl();

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export type ApiFetchInit = RequestInit;

/** 스토어와 라우터가 이 파일을 다시 가져오므로 순환을 피하려고 호출 시점에 불러온다. */
async function logoutOnUnauthorized(): Promise<void> {
  const { useAuthStore } = await import('@/stores/auth');
  const auth = useAuthStore();
  if (!auth.isAuthenticated) {
    return;
  }

  await auth.logout();
  const { router } = await import('@/router');
  if (router.currentRoute.value.path !== '/login') {
    await router.push({ path: '/login', query: { reason: 'sessionExpired' } });
  }
}

/** JSON 본문을 T 로 돌려주는 fetch 래퍼. 204는 본문이 없다. */
export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const { headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  if (rest.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorResponse | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? response.statusText);

    if (response.status === 401) {
      await logoutOnUnauthorized();
    }

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
