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
