export const BOSS_KINDS = [
  'minotaur',
  'hydra',
  'cerberus',
  'kraken',
  'chimera',
  'vampire',
  'giant',
  'abyss_lord',
] as const;

export type BossKind = (typeof BOSS_KINDS)[number];

/** 그림 파일 이름은 웹이 이 키로 고른다. */
export const BOSS_IMAGE_KEYS: Record<BossKind, string> = {
  minotaur: 'minotaur',
  hydra: 'hydra',
  cerberus: 'cerberus',
  kraken: 'kraken',
  chimera: 'chimera',
  vampire: 'vampire',
  giant: 'giant',
  abyss_lord: 'abyss_lord',
};

export const BOSS_LABELS: Record<BossKind, string> = {
  minotaur: '미노타우로스',
  hydra: '히드라',
  cerberus: '케르베로스',
  kraken: '크라켄',
  chimera: '키메라',
  vampire: '뱀파이어',
  giant: '거인',
  abyss_lord: '심연의 군주',
};

/** 판정 전 보스 상한. 넘으면 확정은 409. */
export const BOSS_ACTIVE_MAX = 3;

export function isBossKind(kind: string): kind is BossKind {
  return (BOSS_KINDS as readonly string[]).includes(kind);
}
