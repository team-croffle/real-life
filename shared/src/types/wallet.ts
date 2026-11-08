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
  createdAt: string;
}
