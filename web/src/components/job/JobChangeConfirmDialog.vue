<script setup lang="ts">
import { JOB_CHANGE_COOLDOWN_DAYS } from '@nest-vue/shared';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  name: string;
  pending: boolean;
  error: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [];
}>();

const { t } = useI18n();

function particle(name: string): string {
  const last = name.codePointAt(name.length - 1);
  if (last === undefined || last < 0xac00 || last > 0xd7a3) {
    return '로';
  }
  const jong = (last - 0xac00) % 28;
  return jong === 0 || jong === 8 ? '로' : '으로';
}

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
      :aria-label="t('jobChange.cancel')"
      :disabled="props.pending"
      @click="requestCancel"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface border-border relative z-10 w-full max-w-[340px] rounded-[22px] border p-7"
    >
      <h2 class="mb-2.5 text-[15px] font-bold">
        {{ t('jobChange.confirmTitle') }}
      </h2>
      <p class="text-secondary-foreground mb-[18px] text-[12.5px] leading-relaxed">
        {{
          t('jobChange.confirmBody', {
            name: props.name,
            particle: particle(props.name),
            days: JOB_CHANGE_COOLDOWN_DAYS,
          })
        }}
      </p>
      <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto flex-1"
          :disabled="props.pending"
          @click="requestCancel"
        >
          {{ t('jobChange.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          class="w-auto flex-1"
          :disabled="props.pending"
          @click="emit('confirm')"
        >
          {{ t('jobChange.confirm') }}
        </Button>
      </div>
    </div>
  </div>
</template>
