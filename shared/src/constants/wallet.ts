import { QUEST_REWARDS } from './quests';

export const WALLET_ENTRY_KINDS = [
  'completion',
  'post_hoc_deduction',
  'penalty',
  'employment',
] as const;

export type WalletEntryKind = (typeof WALLET_ENTRY_KINDS)[number];

/** 명세 6.2. 일일 퀘스트 기본 보상(쉬움·일일 골드)의 배수 */
export const WALLET_DEBT_MULTIPLIER = 3;

/** 잔액이 내려갈 수 있는 폭. 바닥은 이 값의 음수 */
export const WALLET_DEBT_LIMIT = QUEST_REWARDS.easy.daily.gold * WALLET_DEBT_MULTIPLIER;
