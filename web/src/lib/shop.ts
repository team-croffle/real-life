import type {
  CreateShopPurchasePayload,
  CreateUserRewardPayload,
  ShopItem,
  UpdateUserRewardPayload,
  WalletBalance,
} from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export function getShop(): Promise<ShopItem[]> {
  return apiFetch<ShopItem[]>('/shop');
}

export function createUserReward(payload: CreateUserRewardPayload): Promise<ShopItem> {
  return apiFetch<ShopItem>('/shop/rewards', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUserReward(
  rewardId: string,
  payload: UpdateUserRewardPayload,
): Promise<ShopItem> {
  return apiFetch<ShopItem>(`/shop/rewards/${rewardId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUserReward(rewardId: string): Promise<void> {
  return apiFetch<void>(`/shop/rewards/${rewardId}`, { method: 'DELETE' });
}

export function createShopPurchase(payload: CreateShopPurchasePayload): Promise<WalletBalance> {
  return apiFetch<WalletBalance>('/shop/purchases', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
