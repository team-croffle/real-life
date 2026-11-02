export const MONSTER_KINDS = [
  'slime',
  'bat',
  'goblin',
  'wolf',
  'orc',
  'skeleton',
  'golem',
  'dragon',
] as const;

export type MonsterKind = (typeof MONSTER_KINDS)[number];

/** 그림 파일 이름은 웹이 이 키로 고른다. */
export const MONSTER_IMAGE_KEYS: Record<MonsterKind, string> = {
  slime: 'slime',
  bat: 'bat',
  goblin: 'goblin',
  wolf: 'wolf',
  orc: 'orc',
  skeleton: 'skeleton',
  golem: 'golem',
  dragon: 'dragon',
};

export const MONSTER_LABELS: Record<MonsterKind, string> = {
  slime: '슬라임',
  bat: '박쥐',
  goblin: '고블린',
  wolf: '늑대',
  orc: '오크',
  skeleton: '스켈레톤',
  golem: '골렘',
  dragon: '드래곤',
};

/** 목록 응답의 몬스터 상태. 큐의 pending/running/succeeded/failed가 아니다. */
export const MONSTER_STATUSES = ['generating', 'ready', 'failed'] as const;

export type MonsterStatus = (typeof MONSTER_STATUSES)[number];

export function isMonsterKind(kind: string): kind is MonsterKind {
  return (MONSTER_KINDS as readonly string[]).includes(kind);
}
