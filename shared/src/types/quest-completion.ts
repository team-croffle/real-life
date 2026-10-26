import type { StatusEffect } from '../constants/status-effect';

/** 보상 계산에 적용된 항목. 결과 화면에서 "왜 이 금액인지" 보여주는 데 쓴다. */
export interface QuestRewardApplied {
  /** 표에서 나온 기본 금액 */
  baseGold: number;
  baseXp: number;
  /** 체크 비율. 체크한 날 / 지난 날. 루틴과 당일 퀘스트는 1 / 1 */
  markedDays: number;
  elapsedDays: number;
  /** 직업 배율. 1이면 적용 없음 */
  jobMultiplier: number;
  /** 연속 배율. 1이면 적용 없음 */
  comboMultiplier: number;
  /** 수행 내용을 적어서 10%가 붙었는지 */
  noteBonus: boolean;
  /** 크리티컬 배수. 1이면 안 터짐, 2나 3이면 터짐. 골드에만 적용 */
  critMultiplier: number;
}

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
  applied: QuestRewardApplied;
}

export interface QuestDayMarkResult {
  doneOn: string[];
  markedDayCount: number;
}
