import { API_PREFIX } from '@nest-vue/shared';
import type { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_PATH = `/${API_PREFIX}/auth`;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: REFRESH_COOKIE_PATH,
    maxAge: MAX_AGE_MS,
  };
}

export function attachRefreshCookie(res: Response, token: string, secure: boolean): void {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions(secure));
}

export function clearRefreshCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: REFRESH_COOKIE_PATH,
  });
}

export function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === REFRESH_COOKIE_NAME) {
      const value = rest.join('=');
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return undefined;
}
