<script setup lang="ts">
import { Circle, Plus, TriangleAlert } from '@lucide/vue';
import { USER_REWARDS_MAX, type ShopItem } from '@nest-vue/shared';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import RewardFormDialog from '@/components/shop/RewardFormDialog.vue';
import ShopConfirmDialog from '@/components/shop/ShopConfirmDialog.vue';
import ShopItemCard from '@/components/shop/ShopItemCard.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { formatAmount } from '@/lib/formatAmount';
import { createShopPurchase, deleteUserReward, getShop } from '@/lib/shop';
import { getWallet } from '@/lib/wallet';

type SectionState = 'loading' | 'ready' | 'error';

const { t } = useI18n();

const items = ref<ShopItem[]>([]);
const shopState = ref<SectionState>('loading');
const gold = ref<number | null>(null);
const goldState = ref<SectionState>('loading');

const buyTarget = ref<ShopItem | null>(null);
const buyPending = ref(false);
const buyError = ref('');
const formOpen = ref(false);
const formReward = ref<ShopItem | null>(null);
const menuId = ref<string | null>(null);
const deleteTarget = ref<ShopItem | null>(null);
const deletePending = ref(false);
const deleteError = ref('');
const toast = ref('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;

let shopGeneration = 0;
let goldGeneration = 0;
let leftShop = false;

const catalogItems = computed(() => items.value.filter((item) => item.source === 'catalog'));
const customItems = computed(() => items.value.filter((item) => item.source === 'custom'));

async function loadShop(): Promise<void> {
  const generation = ++shopGeneration;
  if (shopState.value !== 'ready') {
    shopState.value = 'loading';
  }
  try {
    const next = await getShop();
    if (generation !== shopGeneration || leftShop) {
      return;
    }
    items.value = next;
    shopState.value = 'ready';
  } catch (cause) {
    if (generation !== shopGeneration || leftShop) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    shopState.value = 'error';
  }
}

async function loadGold(): Promise<void> {
  const generation = ++goldGeneration;
  goldState.value = 'loading';
  try {
    const next = await getWallet();
    if (generation !== goldGeneration || leftShop) {
      return;
    }
    gold.value = next.balance;
    goldState.value = 'ready';
  } catch (cause) {
    if (generation !== goldGeneration || leftShop) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    goldState.value = 'error';
  }
}

function reload(): void {
  void loadShop();
  void loadGold();
}

function showToast(message: string): void {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 2400);
}

function openBuy(item: ShopItem): void {
  if (gold.value === null || gold.value < item.price) {
    return;
  }
  menuId.value = null;
  buyTarget.value = item;
  buyPending.value = false;
  buyError.value = '';
}

function closeBuy(): void {
  if (buyPending.value) {
    return;
  }
  buyTarget.value = null;
  buyError.value = '';
}

async function confirmBuy(): Promise<void> {
  const item = buyTarget.value;
  if (!item || buyPending.value) {
    return;
  }
  buyPending.value = true;
  buyError.value = '';
  try {
    const next = await createShopPurchase({ id: item.id });
    if (leftShop) {
      return;
    }
    goldGeneration += 1;
    gold.value = next.balance;
    goldState.value = 'ready';
    buyTarget.value = null;
    showToast(t('shop.toastBought', { name: item.name }));
  } catch (cause) {
    if (leftShop) {
      return;
    }
    buyPending.value = false;
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 400) {
      buyTarget.value = null;
      showToast(t('shop.toastShortGold'));
      void loadGold();
      return;
    }
    buyError.value = t('shop.buyFailed');
    return;
  }
  buyPending.value = false;
}

function openCreate(): void {
  menuId.value = null;
  formReward.value = null;
  formOpen.value = true;
}

function toggleMenu(id: string): void {
  menuId.value = menuId.value === id ? null : id;
}

function openEdit(item: ShopItem): void {
  menuId.value = null;
  formReward.value = item;
  formOpen.value = true;
}

function openDelete(item: ShopItem): void {
  menuId.value = null;
  deleteTarget.value = item;
  deletePending.value = false;
  deleteError.value = '';
}

function closeDelete(): void {
  if (deletePending.value) {
    return;
  }
  deleteTarget.value = null;
  deleteError.value = '';
}

async function confirmDelete(): Promise<void> {
  const item = deleteTarget.value;
  if (!item || deletePending.value) {
    return;
  }
  deletePending.value = true;
  deleteError.value = '';
  try {
    await deleteUserReward(item.id);
    if (leftShop) {
      return;
    }
    deleteTarget.value = null;
    showToast(t('shop.toastDeleted'));
    void loadShop();
  } catch (cause) {
    if (leftShop) {
      return;
    }
    deletePending.value = false;
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    deleteError.value = t('shop.deleteFailed');
    return;
  }
  deletePending.value = false;
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('[data-shop-menu]')) {
    return;
  }
  menuId.value = null;
}

function closeForm(): void {
  formOpen.value = false;
  formReward.value = null;
}

function onRewardSaved(): void {
  showToast(formReward.value ? t('shop.toastUpdated') : t('shop.toastCreated'));
  void loadShop();
}

onMounted(() => {
  reload();
  window.addEventListener('pointerdown', onPointerDown);
});

onUnmounted(() => {
  leftShop = true;
  clearTimeout(toastTimer);
  window.removeEventListener('pointerdown', onPointerDown);
});
</script>

<template>
  <AppShell>
    <div>
      <h1 class="mb-5 text-2xl font-bold">{{ t('nav.shop') }}</h1>

      <div
        v-if="goldState === 'loading'"
        class="bg-gold-soft mb-6 h-[92px] animate-pulse rounded-[20px]"
      />
      <div
        v-else-if="goldState === 'error'"
        class="bg-surface border-border mb-6 flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('shop.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadGold">
          {{ t('shop.retry') }}
        </Button>
      </div>
      <div
        v-else-if="gold !== null"
        class="bg-gold-soft mb-6 flex items-center justify-between rounded-[20px] px-7 py-6"
      >
        <div>
          <p class="text-secondary-foreground mb-1.5 text-[13px]">{{ t('shop.goldLabel') }}</p>
          <p class="text-gold text-[28px] font-bold">
            {{ t('shop.goldAmount', { amount: formatAmount(gold) }) }}
          </p>
        </div>
        <Circle class="text-gold size-[42px]" :stroke-width="1.5" />
      </div>

      <h2 class="mb-3.5 text-[15px] font-bold">{{ t('shop.catalogTitle') }}</h2>
      <div
        v-if="shopState === 'loading' || goldState === 'loading'"
        class="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <div
          v-for="n in 5"
          :key="n"
          class="bg-surface border-border h-[180px] animate-pulse rounded-[18px] border"
        />
      </div>
      <div
        v-else-if="shopState === 'error'"
        class="bg-surface border-border mb-7 flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('shop.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadShop">
          {{ t('shop.retry') }}
        </Button>
      </div>
      <div v-else class="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ShopItemCard
          v-for="item in catalogItems"
          :key="item.id"
          :item="item"
          :gold="gold"
          @buy="openBuy(item)"
        />
      </div>

      <div class="mb-3.5 flex items-center justify-between gap-3">
        <h2 class="text-[15px] font-bold">
          {{ t('shop.customTitle') }}
          <span class="text-muted-foreground text-xs font-semibold">
            {{ t('shop.customCount', { count: customItems.length, max: USER_REWARDS_MAX }) }}
          </span>
        </h2>
        <Button
          type="button"
          size="sm"
          class="w-auto gap-1.5 rounded-full px-3.5"
          @click="openCreate"
        >
          <Plus class="size-3" />
          {{ t('shop.register') }}
        </Button>
      </div>
      <div
        v-if="shopState === 'loading'"
        class="border-border h-[88px] animate-pulse rounded-[18px] border border-dashed"
      />
      <div
        v-else-if="shopState === 'error'"
        class="bg-surface border-border flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('shop.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadShop">
          {{ t('shop.retry') }}
        </Button>
      </div>
      <div
        v-else-if="customItems.length === 0"
        class="border-border text-secondary-foreground rounded-[18px] border border-dashed px-5 py-7 text-center text-[13px] leading-relaxed"
      >
        {{ t('shop.customEmpty') }}
      </div>
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ShopItemCard
          v-for="item in customItems"
          :key="item.id"
          :item="item"
          :gold="gold"
          show-menu
          :menu-open="menuId === item.id"
          @buy="openBuy(item)"
          @toggle-menu="toggleMenu(item.id)"
          @edit="openEdit(item)"
          @remove="openDelete(item)"
        />
      </div>
    </div>

    <RewardFormDialog
      v-if="formOpen"
      :reward="formReward"
      @close="closeForm"
      @saved="onRewardSaved"
    />

    <ShopConfirmDialog
      v-if="deleteTarget"
      :title="t('shop.deleteTitle')"
      :body="t('shop.deleteBody', { name: deleteTarget.name })"
      :confirm-label="t('shop.delete')"
      danger
      :pending="deletePending"
      :error="deleteError"
      @cancel="closeDelete"
      @confirm="confirmDelete"
    />

    <ShopConfirmDialog
      v-if="buyTarget && gold !== null && !deleteTarget"
      :title="t('shop.buyTitle', { name: buyTarget.name })"
      :body="t('shop.buyBody')"
      :confirm-label="t('shop.buy')"
      :pending="buyPending"
      :error="buyError"
      :price="buyTarget.price"
      :before-gold="gold"
      :after-gold="gold - buyTarget.price"
      @cancel="closeBuy"
      @confirm="confirmBuy"
    />

    <p
      v-if="toast"
      class="bg-foreground text-background fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold md:bottom-8"
    >
      {{ toast }}
    </p>
  </AppShell>
</template>
