import type { ShopKind } from '../constants/shop';

export const SHOP_ITEM_SOURCES = ['catalog', 'custom'] as const;

export type ShopItemSource = (typeof SHOP_ITEM_SOURCES)[number];

export interface ShopItem {
  source: ShopItemSource;
  id: string;
  kind: ShopKind;
  name: string;
  price: number;
}

export interface CreateUserRewardPayload {
  name: string;
  kind: ShopKind;
  price: number;
}

export interface UpdateUserRewardPayload {
  name?: string;
  kind?: ShopKind;
  price?: number;
}

export interface CreateShopPurchasePayload {
  id: string;
}
