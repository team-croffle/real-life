import type { StatusEffect } from '../constants/status-effect';

export interface QuestPenaltyApplied {
  questId: string;
  missedOn: string;
  gold: number;
  xp: number;
}

export interface QuestPenaltySettlement {
  settledThrough: string;
  comboDayCount: number;
  statusEffect: StatusEffect | null;
  penalties: QuestPenaltyApplied[];
  balance: number;
  level: number;
  levelXp: number;
}
