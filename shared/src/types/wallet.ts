import type { WalletEntryKind } from '../constants/wallet';

export interface WalletBalance {
  balance: number;
}

export interface WalletEntry {
  id: string;
  amount: number;
  kind: WalletEntryKind;
  createdAt: string;
}
