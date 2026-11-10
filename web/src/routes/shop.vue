<script setup lang="ts">
import { USER_REWARDS_MAX, type ShopItem } from '@nest-vue/shared';
import { Circle, Plus, TriangleAlert } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import ShopItemCard from '@/components/shop/ShopItemCard.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { getShop } from '@/lib/shop';
import { getWallet } from '@/lib/wallet';

type SectionState = 'loading' | 'ready' | 'error';

const { t } = useI18n();

const items = ref<ShopItem[]>([]);
const shopState = ref<SectionState>('loading');
const gold = ref<number | null>(null);
const goldState = ref<SectionState>('loading');

let shopGeneration = 0;
let goldGeneration = 0;
let leftShop = false;

const catalogItems = computed(() => items.value.filter((item) => item.source === 'catalog'));
const customItems = computed(() => items.value.filter((item) => item.source === 'custom'));

async function loadShop(): Promise<void> {
  const generation = ++shopGeneration;
  shopState.value = 'loading';
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

onMounted(reload);

onUnmounted(() => {
  leftShop = true;
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
            {{ t('shop.goldAmount', { amount: gold }) }}
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
      <div v-else-if="gold !== null" class="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ShopItemCard v-for="item in catalogItems" :key="item.id" :item="item" :gold="gold" />
      </div>

      <div class="mb-3.5 flex items-center justify-between gap-3">
        <h2 class="text-[15px] font-bold">
          {{ t('shop.customTitle') }}
          <span class="text-muted-foreground text-xs font-semibold">
            {{ t('shop.customCount', { count: customItems.length, max: USER_REWARDS_MAX }) }}
          </span>
        </h2>
        <Button type="button" size="sm" class="w-auto gap-1.5 rounded-full px-3.5">
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
      <div v-else-if="gold !== null" class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ShopItemCard v-for="item in customItems" :key="item.id" :item="item" :gold="gold" />
      </div>
    </div>
  </AppShell>
</template>
