<script setup lang="ts">
import type { ShopItem, ShopKind } from '@nest-vue/shared';
import { Bed, Ellipsis, Gamepad2, Lock, ShoppingBag, Users, Utensils } from 'lucide-vue-next';
import type { Component } from 'vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = withDefaults(
  defineProps<{
    item: ShopItem;
    gold: number | null;
    showMenu?: boolean;
    menuOpen?: boolean;
  }>(),
  {
    showMenu: false,
    menuOpen: false,
  },
);

const emit = defineEmits<{
  buy: [];
  toggleMenu: [];
  edit: [];
  remove: [];
}>();

const { t } = useI18n();

const KIND_ICONS: Record<ShopKind, Component> = {
  hobby: Gamepad2,
  rest: Bed,
  food: Utensils,
  outing: Users,
  shopping: ShoppingBag,
};

const KIND_ICON_CLASS: Record<ShopKind, string> = {
  hobby: 'text-intel',
  rest: 'text-emo',
  food: 'text-destructive',
  outing: 'text-primary',
  shopping: 'text-gold',
};

const canBuy = computed(() => props.gold !== null && props.gold >= props.item.price);
const shortGold = computed(() => props.gold !== null && props.gold < props.item.price);
</script>

<template>
  <div
    class="bg-surface border-border relative flex flex-col gap-3 rounded-[18px] border p-5"
    :class="canBuy ? '' : 'opacity-70'"
  >
    <div v-if="showMenu" class="absolute top-3.5 right-3" data-shop-menu>
      <button
        type="button"
        class="text-muted-foreground p-1"
        :aria-label="t('shop.menu')"
        :aria-expanded="menuOpen"
        @click="emit('toggleMenu')"
      >
        <Ellipsis class="size-[17px]" />
      </button>
      <div
        v-if="menuOpen"
        class="bg-surface border-border absolute top-8 right-0 z-10 w-[110px] overflow-hidden rounded-[10px] border shadow-lg"
      >
        <button
          type="button"
          class="block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('edit')"
        >
          {{ t('shop.edit') }}
        </button>
        <button
          type="button"
          class="text-destructive block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('remove')"
        >
          {{ t('shop.delete') }}
        </button>
      </div>
    </div>
    <div class="bg-muted flex size-11 items-center justify-center rounded-xl">
      <component :is="KIND_ICONS[item.kind]" class="size-5" :class="KIND_ICON_CLASS[item.kind]" />
    </div>
    <div>
      <p class="mb-0.5 truncate text-[13.5px] font-semibold">{{ item.name }}</p>
      <p class="text-gold text-[13px]">{{ t('shop.price', { amount: item.price }) }}</p>
    </div>
    <Button v-if="canBuy" type="button" size="sm" class="w-full rounded-full" @click="emit('buy')">
      {{ t('shop.buy') }}
    </Button>
    <Button v-else type="button" variant="outline" size="sm" class="w-full rounded-full" disabled>
      <Lock v-if="shortGold" class="size-3" />
      {{ shortGold ? t('shop.shortGold') : t('shop.buy') }}
    </Button>
  </div>
</template>
