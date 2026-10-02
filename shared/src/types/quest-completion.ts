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
}

export interface QuestDayMarkResult {
  doneOn: string[];
  markedDayCount: number;
}
