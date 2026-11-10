<script setup lang="ts">
import type { ShopItem, ShopKind } from '@nest-vue/shared';
import {
  QUEST_TITLE_MAX,
  SHOP_KINDS,
  SHOP_KIND_SUGGESTED_PRICES,
  USER_REWARD_PRICE_MAX,
  USER_REWARD_PRICE_MIN,
} from '@nest-vue/shared';
import { X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/composables/useApi';
import { createUserReward, updateUserReward } from '@/lib/shop';

const props = defineProps<{
  reward: ShopItem | null;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();

const name = ref('');
const kind = ref<ShopKind>('hobby');
const priceText = ref(String(SHOP_KIND_SUGGESTED_PRICES.hobby));
const priceTouched = ref(false);
const pending = ref(false);
const error = ref('');

const isEdit = computed(() => props.reward !== null);
const heading = computed(() => (isEdit.value ? t('shop.editTitle') : t('shop.createTitle')));
const submitLabel = computed(() => (isEdit.value ? t('shop.save') : t('shop.register')));

function resetForm(): void {
  const reward = props.reward;
  if (reward) {
    name.value = reward.name;
    kind.value = reward.kind;
    priceText.value = String(reward.price);
    priceTouched.value = true;
  } else {
    name.value = '';
    kind.value = 'hobby';
    priceText.value = String(SHOP_KIND_SUGGESTED_PRICES.hobby);
    priceTouched.value = false;
  }
  pending.value = false;
  error.value = '';
}

watch(() => props.reward, resetForm, { immediate: true });

function selectKind(next: ShopKind): void {
  kind.value = next;
  error.value = '';
  if (!priceTouched.value) {
    priceText.value = String(SHOP_KIND_SUGGESTED_PRICES[next]);
  }
}

function onPriceInput(value: string | number | undefined): void {
  priceText.value = value === undefined ? '' : String(value);
  priceTouched.value = true;
  error.value = '';
}

function requestClose(): void {
  if (pending.value) {
    return;
  }
  emit('close');
}

function formErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.status === 409) {
    return t('shop.limitReached');
  }
  return t('shop.saveFailed');
}

async function onSubmit(): Promise<void> {
  error.value = '';
  const trimmed = name.value.trim();
  if (!trimmed) {
    error.value = t('shop.nameRequired');
    return;
  }
  const price = Number(priceText.value);
  if (!Number.isInteger(price) || price < USER_REWARD_PRICE_MIN || price > USER_REWARD_PRICE_MAX) {
    error.value = t('shop.priceInvalid');
    return;
  }

  pending.value = true;
  let saved = false;
  try {
    if (props.reward) {
      await updateUserReward(props.reward.id, { name: trimmed, kind: kind.value, price });
    } else {
      await createUserReward({ name: trimmed, kind: kind.value, price });
    }
    saved = true;
  } catch (cause) {
    const message = formErrorMessage(cause);
    if (message) {
      error.value = message;
    }
  } finally {
    pending.value = false;
  }
  if (saved) {
    emit('saved');
    emit('close');
  }
}
</script>

<template>
  <div class="fixed inset-0 z-30 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('shop.cancel')"
      @click="requestClose"
    />
    <form
      class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-[22px] p-[26px] shadow-xl"
      @submit.prevent="onSubmit"
    >
      <div class="mb-[18px] flex items-center justify-between">
        <h2 class="text-base font-bold">{{ heading }}</h2>
        <button
          type="button"
          class="bg-muted text-secondary-foreground flex size-7 items-center justify-center rounded-full"
          :aria-label="t('shop.cancel')"
          :disabled="pending"
          @click="requestClose"
        >
          <X class="size-3.5" />
        </button>
      </div>

      <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('shop.kindLabel') }}</p>
      <div class="mb-1.5 grid grid-cols-5 gap-1.5">
        <Button
          v-for="value in SHOP_KINDS"
          :key="value"
          type="button"
          size="sm"
          class="w-auto px-0 text-[12px] whitespace-nowrap"
          :variant="kind === value ? 'default' : 'outline'"
          :disabled="pending"
          @click="selectKind(value)"
        >
          {{ t(`shop.kinds.${value}`) }}
        </Button>
      </div>
      <p class="text-muted-foreground mb-4 text-[11px]">
        {{ t('shop.kindExample', { example: t(`shop.kindExamples.${kind}`) }) }}
      </p>

      <div class="mb-2 flex items-center justify-between">
        <span class="text-muted-foreground text-[11.5px]">{{ t('shop.nameLabel') }}</span>
        <span class="text-muted-foreground text-[11px]"
          >{{ name.length }}/{{ QUEST_TITLE_MAX }}</span
        >
      </div>
      <Input
        v-model="name"
        type="text"
        :maxlength="QUEST_TITLE_MAX"
        class="mb-4"
        :placeholder="t('shop.namePlaceholder')"
        :disabled="pending"
        @input="error = ''"
      />

      <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('shop.priceLabel') }}</p>
      <div class="border-border bg-surface mb-1.5 flex items-center gap-1.5 rounded-xl border px-3">
        <Input
          :model-value="priceText"
          type="number"
          inputmode="numeric"
          :min="USER_REWARD_PRICE_MIN"
          :max="USER_REWARD_PRICE_MAX"
          class="min-w-0 flex-1 border-0 px-0 py-2.5 shadow-none focus-visible:ring-0"
          :disabled="pending"
          @update:model-value="onPriceInput"
        />
        <span class="text-muted-foreground text-xs">G</span>
      </div>
      <p class="text-muted-foreground mb-4 text-[11px]">{{ t('shop.priceHint') }}</p>

      <p v-if="error" class="text-destructive mb-2.5 text-xs">{{ error }}</p>

      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto flex-1"
          :disabled="pending"
          @click="requestClose"
        >
          {{ t('shop.cancel') }}
        </Button>
        <Button type="submit" size="sm" class="w-auto flex-1" :disabled="pending">
          {{ submitLabel }}
        </Button>
      </div>
    </form>
  </div>
</template>
