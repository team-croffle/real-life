import { ACCOUNT_SUSPENDED_CODE } from './constants/admin';

export function isAccountSuspended(
  account: { suspended: boolean; suspendedUntil: Date | string | null },
  now: Date = new Date(),
): boolean {
  if (!account.suspended) {
    return false;
  }
  if (account.suspendedUntil === null) {
    return true;
  }
  const until =
    account.suspendedUntil instanceof Date
      ? account.suspendedUntil
      : new Date(account.suspendedUntil);
  return until.getTime() > now.getTime();
}

export function accountSuspendedBody(account: {
  suspendedUntil: Date | string | null;
  suspendReason: string | null;
}): {
  message: string;
  code: string;
  suspendedUntil: string | null;
  suspendReason: string | null;
} {
  const until = account.suspendedUntil;
  return {
    message: 'Account suspended',
    code: ACCOUNT_SUSPENDED_CODE,
    suspendedUntil:
      until === null ? null : until instanceof Date ? until.toISOString() : String(until),
    suspendReason: account.suspendReason,
  };
}
