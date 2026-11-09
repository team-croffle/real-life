<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

import MonsterImage from './MonsterImage.vue';

export type MonsterViewTarget = {
  name: string;
  imageKey: string;
  description: string;
  title: string;
};

defineProps<{
  name: string;
  imageKey: string;
  description: string;
  title: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close');
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('quest.close')"
      @click="emit('close')"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 flex w-full max-w-[340px] flex-col items-center rounded-[22px] px-6 pt-7 pb-6 shadow-xl"
    >
      <MonsterImage :image-key="imageKey" size="large" />
      <h2 class="mt-3 text-base font-bold">{{ name }}</h2>
      <p class="text-muted-foreground mt-1 text-center text-[12.5px]">{{ title }}</p>
      <p class="text-secondary-foreground mt-3 text-center text-[13px]">{{ description }}</p>
      <Button type="button" class="mt-5 w-full" @click="emit('close')">
        {{ t('quest.close') }}
      </Button>
    </div>
  </div>
</template>
