export const SHOP_KINDS = ['game', 'video', 'dessert', 'delivery', 'outing'] as const;

export type ShopKind = (typeof SHOP_KINDS)[number];

export const SHOP_KIND_LABELS: Record<ShopKind, string> = {
  game: '게임',
  video: '영상',
  dessert: '디저트/커피',
  delivery: '배달',
  outing: '카페/영화',
};

export function isShopKind(kind: string): kind is ShopKind {
  return (SHOP_KINDS as readonly string[]).includes(kind);
}

/** 직접 등록 보상 상한. 넘으면 409. */
export const USER_REWARDS_MAX = 20;

export const USER_REWARD_PRICE_MIN = 1;

export const USER_REWARD_PRICE_MAX = 99_999;

export interface ShopCatalogItem {
  kind: ShopKind;
  name: string;
  price: number;
}

/** 모두에게 같은 기본 아이템. DB에 넣지 않는다. 가격은 자리값. */
export const SHOP_CATALOG: readonly ShopCatalogItem[] = [
  { kind: 'game', name: '게임 플레이권 1시간', price: 100 },
  { kind: 'video', name: '유튜브/영상 시청권 1시간', price: 100 },
  { kind: 'dessert', name: '디저트 / 커피 구매권', price: 300 },
  { kind: 'delivery', name: '배달음식 주문권', price: 500 },
  { kind: 'outing', name: '카페 / 영화권', price: 1000 },
];
