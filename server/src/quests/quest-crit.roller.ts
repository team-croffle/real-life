import type { CritForce } from '@nest-vue/shared';
import { CRIT_FORCE_VALUES, QUEST_CRIT } from '@nest-vue/shared';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/** 크리티컬 배수를 정한다. 1이면 터지지 않은 것이다. */
@Injectable()
export class QuestCritRoller {
  constructor(private readonly config: ConfigService) {}

  roll(): number {
    const forced = this.forcedValue();
    if (forced === 'double') {
      return QUEST_CRIT.doubleMultiplier;
    }
    if (forced === 'triple') {
      return QUEST_CRIT.tripleMultiplier;
    }
    if (forced === 'none') {
      return 1;
    }

    if (Math.random() >= QUEST_CRIT.chance) {
      return 1;
    }
    return Math.random() < QUEST_CRIT.tripleChance
      ? QUEST_CRIT.tripleMultiplier
      : QUEST_CRIT.doubleMultiplier;
  }

  /** 운영 환경에서는 검증용 스위치를 무시한다. */
  private forcedValue(): CritForce | null {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      return null;
    }
    const value = this.config.get<string>('CRIT_FORCE');
    return CRIT_FORCE_VALUES.find((allowed) => allowed === value) ?? null;
  }
}
