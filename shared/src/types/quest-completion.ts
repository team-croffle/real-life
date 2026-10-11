import type { StatusEffect } from '../constants/status-effect';

export interface QuestCompletionResult {
  gold: number;
  xp: number;
  balance: number;
  level: number;
  levelXp: number;
  xpToNext: number | null;
  ticketsGranted: number;
  ticketCount: number;
  titlesGranted: number[];
  statusEffect: StatusEffect | null;
}

export interface QuestDayMarkResult {
  doneOn: string[];
  markedDayCount: number;
}
