import type { StatusEffect } from '../constants/status-effect';

export interface Progress {
  level: number;
  levelXp: number;
  xpToNext: number | null;
  gachaTicketCount: number;
  comboDayCount: number;
  statusEffect: StatusEffect | null;
  titleMarks: number[];
}
