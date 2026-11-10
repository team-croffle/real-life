import type { WalletEntryKind } from '../constants/wallet';

export interface WalletBalance {
  balance: number;
}

export interface WalletEntry {
  id: string;
  amount: number;
  tickets: number;
  kind: WalletEntryKind;
  questId: string | null;
  bossId: string | null;
  /** 구매 당시 보상 이름. 구매가 아니면 null */
  purchasedName: string | null;
  createdAt: string;
}
