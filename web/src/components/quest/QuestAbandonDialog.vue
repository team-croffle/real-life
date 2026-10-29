<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  title: string;
  pending: boolean;
  error: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const { t } = useI18n();

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
      <h2 class="mb-2 text-[15px] font-bold">{{ t('quest.abandonTitle') }}</h2>
      <p class="text-secondary-foreground mb-4 text-[12.5px] leading-normal">
        {{ t('quest.abandonBody', { title }) }}
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
          {{ t('quest.abandon') }}
        </Button>
      </div>
    </div>
  </div>
</template>
