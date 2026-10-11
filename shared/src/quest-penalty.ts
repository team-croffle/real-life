import { WALLET_DEBT_LIMIT } from './constants/wallet';

/** 바닥은 -WALLET_DEBT_LIMIT. 남는 차감액은 버리고, 잔액은 올리지 않는다. */
export function appliedGoldPenalty(balance: number, loss: number): number {
  if (loss <= 0) {
    return 0;
  }
  const room = Math.max(0, balance + WALLET_DEBT_LIMIT);
  return Math.min(loss, room);
}

/** 현재 레벨 경험치의 0까지만 깎는다. 레벨은 바꾸지 않는다. */
export function appliedXpPenalty(levelXp: number, loss: number): number {
  if (loss <= 0) {
    return 0;
  }
  return Math.min(loss, Math.max(0, levelXp));
}
