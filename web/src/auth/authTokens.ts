const LEGACY_ACCESS_KEY = 'real-life:accessToken';
const LEGACY_REFRESH_KEY = 'real-life:refreshToken';

let accessToken: string | null = null;

export function discardLegacyTokenStorage(): void {
  globalThis.localStorage?.removeItem(LEGACY_ACCESS_KEY);
  globalThis.localStorage?.removeItem(LEGACY_REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
}
