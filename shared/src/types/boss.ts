import type { BossKind, BossResult } from '../constants/bosses';
import type { MonsterStatus } from '../constants/monsters';
import type { QuestCategory, QuestDifficulty } from '../constants/quests';
import type { Quest } from './quest';
import type { Routine } from './routine';

export type BossSubquestStatus = 'open' | 'done' | 'missed';

export type BossSubquest = BossRoutineSubquest | BossDeadlineSubquest;

/** 확정 때 넣은 하위 루틴. done·missed·remaining은 서울 오늘 기준. */
export interface BossRoutineSubquest {
  kind: 'routine';
  id: string;
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  done: number;
  missed: number;
  remaining: number;
  /** 찍힌 하루 퀘스트 1회. 목록의 expectedGold와 같은 계산 */
  expectedGold: number;
  /** 찍힌 하루 퀘스트 1회. 목록의 expectedXp와 같은 계산 */
  expectedXp: number;
}

/** 확정 때 넣은 하위 기한 퀘스트. routine_id가 없는 행만. */
export interface BossDeadlineSubquest {
  kind: 'deadline';
  id: string;
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  status: BossSubquestStatus;
  /** 그 기한 퀘스트의 목록 expectedGold와 같은 계산 */
  expectedGold: number;
  /** 그 기한 퀘스트의 목록 expectedXp와 같은 계산 */
  expectedXp: number;
}

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

/** GET /api/bosses/history. 처치·실패·포기. 제목은 목표 문구다. */
export interface PastBoss {
  id: string;
  result: BossResult;
  category: QuestCategory;
  title: string;
  endsOn: string;
  maxHp: number;
  hp: number;
  /** 판정한 서울 날짜 */
  judgedOn: string;
  createdOn: string;
  bossStatus: MonsterStatus | null;
  boss: BossAppearance | null;
}

/** GET /api/bosses/unseen. 처치·실패이고 아직 결과 화면을 안 본 보스. */
export interface UnseenBossResult {
  id: string;
  result: 'cleared' | 'failed';
  category: QuestCategory;
  /** 목표 문구 */
  title: string;
  endsOn: string;
  maxHp: number;
  hp: number;
  /** 판정한 서울 날짜 */
  judgedOn: string;
  /** 지갑 줄의 부호 있는 골드. 줄이 없으면 0 */
  gold: number;
  /** bosses.xp_change. 옛 행은 null일 수 있다 */
  xp: number | null;
  /** 지갑 줄의 뽑기권. 줄이 없으면 0 */
  tickets: number;
  bossStatus: MonsterStatus | null;
  boss: BossAppearance | null;
}

export type BossLogKind = 'cut' | 'counter';

/** 진행 중 보스의 가장 최근 깎음 또는 반격. 깎음은 점수, 반격은 골드와 경험치다. */
export type BossLatestLog = BossLatestCut | BossLatestCounter;

export interface BossLatestCut {
  kind: 'cut';
  questTitle: string;
  /** 난이도 점수 */
  amount: number;
  /** 서울 날짜 `YYYY-MM-DD` */
  on: string;
}

export interface BossLatestCounter {
  kind: 'counter';
  questTitle: string;
  /** 적용된 골드 절대값 */
  gold: number;
  /** 적용된 경험치 절대값. `quest_penalties.xp` */
  xp: number;
  /** 서울 날짜 `YYYY-MM-DD` */
  on: string;
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
  latestLog: BossLatestLog | null;
  /** 서울 어제 놓친 하위 퀘스트의 반격이 있는가 */
  counteredToday: boolean;
  subquests: BossSubquest[];
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
