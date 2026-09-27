const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export function apiBaseUrl(): string {
  return API_BASE_URL;
}

/** Better Auth 클라이언트용 origin. `VITE_API_BASE_URL`이 절대 주소면 그 호스트를 쓰고, 상대 경로면 페이지 origin을 쓴다. */
export function apiOrigin(): string {
  if (/^https?:\/\//.test(API_BASE_URL)) {
    return new URL(API_BASE_URL).origin;
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:5173';
  }
  return window.location.origin;
}
