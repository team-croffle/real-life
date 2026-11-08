<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  title: string;
  pending: boolean;
  error: string;
  routine?: boolean;
  gold?: number;
  xp?: number;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const { t } = useI18n();

const chargeGold = computed(() => props.gold ?? 0);
const chargeXp = computed(() => props.xp ?? 0);
const hasCharge = computed(() => chargeGold.value > 0 || chargeXp.value > 0);

function requestCancel(): void {
  if (props.pending) {
    return;
  }
  emit('cancel');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('quest.cancel')"
      @click="requestCancel"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 w-full max-w-[340px] rounded-[18px] p-[22px] shadow-xl"
    >
      <h2 class="mb-2 text-[15px] font-bold">
        {{ routine ? t('quest.deleteTitle') : t('quest.abandonTitle') }}
      </h2>
      <p
        class="text-secondary-foreground text-[12.5px] leading-normal"
        :class="routine ? 'mb-[18px]' : 'mb-3.5'"
      >
        {{ routine ? t('quest.deleteBody') : t('quest.abandonBody', { title }) }}
      </p>
      <div v-if="!routine && hasCharge" class="bg-destructive/10 mb-[18px] rounded-xl px-3.5 py-3">
        <p class="text-secondary-foreground mb-1.5 text-[11.5px]">
          {{ t('quest.deleteCostTitle') }}
        </p>
        <p class="text-destructive flex gap-3.5 text-[15px] font-bold">
          <span v-if="chargeGold > 0">{{ t('quest.deleteCostGold', { gold: chargeGold }) }}</span>
          <span v-if="chargeXp > 0">{{ t('quest.deleteCostXp', { xp: chargeXp }) }}</span>
        </p>
        <p class="text-muted-foreground mt-1.5 text-[11px]">{{ t('quest.deleteCostNote') }}</p>
      </div>
      <p
        v-else-if="!routine"
        class="bg-muted text-secondary-foreground mb-[18px] rounded-xl px-3.5 py-3 text-[12.5px] font-bold"
      >
        {{ t('quest.deleteCostNone') }}
      </p>
      <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto flex-1"
          :disabled="pending"
          @click="requestCancel"
        >
          {{ t('quest.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          class="bg-destructive hover:bg-destructive/90 w-auto flex-1"
          :disabled="pending"
          @click="emit('confirm')"
        >
          {{ routine ? t('quest.delete') : t('quest.abandon') }}
        </Button>
      </div>
    </div>
  </div>
</template>
