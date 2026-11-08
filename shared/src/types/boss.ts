import type { BossKind, BossResult } from '../constants/bosses';
import type { MonsterStatus } from '../constants/monsters';
import type { QuestCategory } from '../constants/quests';
import type { Quest } from './quest';
import type { Routine } from './routine';

export interface BossAppearance {
  kind: BossKind;
  imageKey: string;
  name: string;
  description: string;
}

/** POST /api/bosses/:id/abandon. 골드는 적용된 차감액의 부호를 가진다. */
export interface AbandonedBoss {
  id: string;
  result: Extract<BossResult, 'abandoned'>;
  gold: number;
  xp: number;
  tickets: number;
  balance: number;
}

/** GET /api/bosses. 판정 전만. 제목은 목표 문구이고, 이름은 ready일 때만 있다. */
export interface BossSummary {
  id: string;
  category: QuestCategory;
  title: string;
  endsOn: string;
  maxHp: number;
  hp: number;
  createdOn: string;
  bossStatus: MonsterStatus | null;
  boss: BossAppearance | null;
}

/** POST /api/bosses. 체력은 확정 요청에 없고 서버가 저장한 값이다. */
export interface ConfirmedBoss {
  id: string;
  category: QuestCategory;
  title: string;
  endsOn: string;
  maxHp: number;
  hp: number;
  quests: Quest[];
  routines: Routine[];
}
