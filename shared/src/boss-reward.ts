import {
  BOSS_PENALTY_PER_HP,
  BOSS_REWARD_PER_HP,
  BOSS_TICKET_BASE,
  BOSS_TICKET_HP_PER_EXTRA,
  BOSS_TICKET_MAX,
} from './constants/bosses';

/** 80% 처치선. 깎은 체력이 이 값 이상이면 처치다. */
export function bossClearLine(maxHp: number): number {
  return Math.ceil((maxHp * 4) / 5);
}

export function bossDamage(maxHp: number, hp: number): number {
  return maxHp - hp;
}

/** 깎은 체력 × 5가 최대 체력 × 4 이상이면 처치다. */
export function bossCleared(maxHp: number, hp: number): boolean {
  return bossDamage(maxHp, hp) * 5 >= maxHp * 4;
}

/** 처치선까지 모자란 체력. 이미 넘었으면 0. */
export function bossShortfall(maxHp: number, hp: number): number {
  return Math.max(0, bossClearLine(maxHp) - bossDamage(maxHp, hp));
}

/** 직업 배율과 연속 배율을 곱하지 않는다. 뽑기권은 공식 장수이고, 레벨업 장수는 포함하지 않는다. */
export function bossClearReward(damage: number): { gold: number; xp: number; tickets: number } {
  const tickets = Math.min(
    BOSS_TICKET_MAX,
    BOSS_TICKET_BASE + Math.floor(damage / BOSS_TICKET_HP_PER_EXTRA),
  );
  return {
    gold: damage * BOSS_REWARD_PER_HP,
    xp: damage * BOSS_REWARD_PER_HP,
    tickets,
  };
}

/** 직업 배율과 연속 배율을 곱하지 않는다. */
export function bossFailPenalty(shortfall: number): { gold: number; xp: number } {
  return {
    gold: shortfall * BOSS_PENALTY_PER_HP,
    xp: shortfall * BOSS_PENALTY_PER_HP,
  };
}
