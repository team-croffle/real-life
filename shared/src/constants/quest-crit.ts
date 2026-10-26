/** 명세 7.2. 크리티컬은 골드에만 적용한다. 확률과 배수는 여기서만 바꾼다. */
export const QUEST_CRIT = {
  /** 크리티컬이 터질 확률 (0~1) */
  chance: 0.1,
  /** 터졌을 때 3배가 될 확률 (0~1). 나머지는 2배다. */
  tripleChance: 0.1,
  doubleMultiplier: 2,
  tripleMultiplier: 3,
} as const;

/** 검증용 스위치 값. CRIT_FORCE 환경변수에 쓴다. */
export const CRIT_FORCE_VALUES = ['double', 'triple', 'none'] as const;
export type CritForce = (typeof CRIT_FORCE_VALUES)[number];
