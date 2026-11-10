export const SHOP_KINDS = ['hobby', 'rest', 'food', 'outing', 'shopping'] as const;

export type ShopKind = (typeof SHOP_KINDS)[number];

export function isShopKind(kind: string): kind is ShopKind {
  return (SHOP_KINDS as readonly string[]).includes(kind);
}

export const SHOP_CATALOG_IDS = ['game', 'video', 'dessert', 'delivery', 'cafe_movie'] as const;

export type ShopCatalogId = (typeof SHOP_CATALOG_IDS)[number];

export function isShopCatalogId(id: string): id is ShopCatalogId {
  return (SHOP_CATALOG_IDS as readonly string[]).includes(id);
}

/** 직접 등록에서 종류를 고를 때 채우는 추천 가격. 자리값. */
export const SHOP_KIND_SUGGESTED_PRICES: Record<ShopKind, number> = {
  hobby: 100,
  rest: 100,
  food: 300,
  outing: 1000,
  shopping: 1000,
};

/** 직접 등록 보상 상한. 넘으면 409. */
export const USER_REWARDS_MAX = 20;

export const USER_REWARD_PRICE_MIN = 1;

export const USER_REWARD_PRICE_MAX = 99_999;

export interface ShopCatalogItem {
  id: ShopCatalogId;
  kind: ShopKind;
  name: string;
  price: number;
}

/** 모두에게 같은 기본 아이템. DB에 넣지 않는다. 가격은 자리값. */
export const SHOP_CATALOG: readonly ShopCatalogItem[] = [
  { id: 'game', kind: 'hobby', name: '게임 플레이권 1시간', price: 100 },
  { id: 'video', kind: 'hobby', name: '유튜브/영상 시청권 1시간', price: 100 },
  { id: 'dessert', kind: 'food', name: '디저트 / 커피 구매권', price: 300 },
  { id: 'delivery', kind: 'food', name: '배달음식 주문권', price: 500 },
  { id: 'cafe_movie', kind: 'outing', name: '카페 / 영화권', price: 1000 },
];
