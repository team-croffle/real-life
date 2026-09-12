import type { ApiErrorResponse } from '@nest-vue/shared';
import { ref, type Ref } from 'vue';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** JSON 본문을 T 로 돌려주는 fetch 래퍼. 204는 본문이 없다. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });

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

export function useApi<T>(path: string, init?: RequestInit): UseApiResult<T> {
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
