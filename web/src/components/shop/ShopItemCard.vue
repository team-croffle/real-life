<script setup lang="ts">
import type { ShopItem, ShopKind } from '@nest-vue/shared';
import { Bed, Gamepad2, Lock, ShoppingBag, Users, Utensils } from 'lucide-vue-next';
import type { Component } from 'vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  item: ShopItem;
  gold: number;
}>();

const emit = defineEmits<{
  buy: [];
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

const canBuy = computed(() => props.gold >= props.item.price);
</script>

<template>
  <div
    class="bg-surface border-border flex flex-col gap-3 rounded-[18px] border p-5"
    :class="canBuy ? '' : 'opacity-70'"
  >
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
      <Lock class="size-3" />
      {{ t('shop.shortGold') }}
    </Button>
  </div>
</template>
