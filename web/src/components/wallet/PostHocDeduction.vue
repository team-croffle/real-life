<script setup lang="ts">
import { WALLET_DEBT_LIMIT } from '@nest-vue/shared';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { createPostHocDeduction } from '@/lib/wallet';

const props = defineProps<{
  balance: number;
}>();

const emit = defineEmits<{
  deducted: [];
}>();

const { t } = useI18n();

const amountText = ref('');
const error = ref('');
const confirmOpen = ref(false);
const pending = ref(false);

const amount = computed(() => Math.floor(Number(amountText.value)));
const balanceAfter = computed(() => props.balance - amount.value);

function onInput(event: Event): void {
  amountText.value = (event.target as HTMLInputElement).value;
  error.value = '';
}

// 서버도 같은 규칙으로 막지만, 확인 창을 띄우기 전에 먼저 알려 준다.
function openConfirm(): void {
  if (!Number.isFinite(amount.value) || amount.value < 1) {
    error.value = t('wallet.postHoc.invalid');
    return;
  }
  if (balanceAfter.value < -WALLET_DEBT_LIMIT) {
    error.value = t('wallet.postHoc.overLimit', { limit: WALLET_DEBT_LIMIT });
    return;
  }
  confirmOpen.value = true;
}

function cancel(): void {
  if (pending.value) {
    return;
  }
  confirmOpen.value = false;
}

async function confirm(): Promise<void> {
  if (pending.value) {
    return;
  }
  pending.value = true;
  try {
    await createPostHocDeduction(amount.value);
    confirmOpen.value = false;
    amountText.value = '';
    emit('deducted');
  } catch (cause) {
    confirmOpen.value = false;
    if (cause instanceof ApiError && cause.status === 400) {
      error.value = t('wallet.postHoc.overLimit', { limit: WALLET_DEBT_LIMIT });
    } else if (!(cause instanceof ApiError && cause.status === 401)) {
      error.value = t('wallet.postHoc.failed');
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <section class="mt-6">
    <h2 class="mb-3 text-sm font-bold">{{ t('wallet.postHoc.title') }}</h2>
    <div class="bg-surface border-border rounded-[18px] border px-5 py-5">
      <p class="text-muted-foreground mb-3.5 text-[11.5px] leading-normal">
        {{ t('wallet.postHoc.body') }}
      </p>
      <div class="flex items-center gap-2">
        <label
          class="bg-muted flex flex-1 items-center gap-1.5 rounded-xl border px-3"
          :class="error ? 'border-destructive' : 'border-border'"
        >
          <input
            type="number"
            min="1"
            inputmode="numeric"
            :value="amountText"
            :placeholder="t('wallet.postHoc.placeholder')"
            :aria-label="t('wallet.postHoc.placeholder')"
            class="text-foreground min-w-0 flex-1 bg-transparent py-2.5 text-[13px] outline-none"
            @input="onInput"
            @keydown.enter.prevent="openConfirm"
          />
          <span class="text-muted-foreground text-xs">G</span>
        </label>
        <Button
          type="button"
          size="sm"
          class="bg-destructive hover:bg-destructive/90 w-auto px-[18px]"
          :disabled="!amountText"
          @click="openConfirm"
        >
          {{ t('wallet.postHoc.submit') }}
        </Button>
      </div>
      <p v-if="error" class="text-destructive mt-2 text-[11.5px]">
        {{ error }}
      </p>
    </div>

    <div v-if="confirmOpen" class="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        class="bg-overlay absolute inset-0"
        :aria-label="t('wallet.postHoc.cancel')"
        @click="cancel"
      />
      <div
        role="dialog"
        aria-modal="true"
        class="bg-surface relative z-10 w-full max-w-[340px] rounded-[18px] p-[22px] shadow-xl"
      >
        <h3 class="mb-2 text-[15px] font-bold">
          {{ t('wallet.postHoc.confirmTitle', { amount }) }}
        </h3>
        <p class="text-secondary-foreground mb-[18px] text-[12.5px] leading-normal">
          {{ t('wallet.postHoc.confirmBody', { after: balanceAfter }) }}
        </p>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="flex-1"
            :disabled="pending"
            @click="cancel"
          >
            {{ t('wallet.postHoc.cancel') }}
          </Button>
          <Button
            type="button"
            size="sm"
            class="bg-destructive hover:bg-destructive/90 flex-1"
            :disabled="pending"
            @click="confirm"
          >
            {{ t('wallet.postHoc.confirm') }}
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
