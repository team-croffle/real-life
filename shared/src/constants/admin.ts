export const ACCOUNT_SUSPENDED_CODE = 'ACCOUNT_SUSPENDED';

export const SUSPEND_REASON_MAX = 200;

export const ANNOUNCEMENT_TITLE_MAX = 100;

export const ANNOUNCEMENT_BODY_MAX = 2000;

export const ANNOUNCEMENT_ALLOWED_TAGS = ['h3', 'p', 'strong', 'ul', 'li', 'br'] as const;

export const EVENT_MULTIPLIER_MIN = 1;

export const EVENT_MULTIPLIER_MAX = 3;

export const EVENT_MULTIPLIER_STEP = 0.1;

export const EVENT_MULTIPLIER_TENTHS_MIN = 10;

export const EVENT_MULTIPLIER_TENTHS_MAX = 30;

export const ADMIN_USER_PAGE_SIZE = 20;

export function eventMultiplierFromTenths(tenths: number): number {
  return tenths / 10;
}

export function eventMultiplierToTenths(multiplier: number): number {
  return Math.round(multiplier * 10);
}

export function isEventMultiplier(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }
  const tenths = eventMultiplierToTenths(value);
  if (tenths < EVENT_MULTIPLIER_TENTHS_MIN || tenths > EVENT_MULTIPLIER_TENTHS_MAX) {
    return false;
  }
  return Math.abs(value * 10 - tenths) < 1e-9;
}
