<script setup lang="ts">
import { Star } from 'lucide-vue-next';
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  name: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  timer = setTimeout(() => emit('close'), 2000);
});

onUnmounted(() => {
  clearTimeout(timer);
});
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <div class="bg-overlay absolute inset-0" />
    <div
      role="status"
      class="bg-surface border-accent relative z-10 flex w-full max-w-[300px] flex-col items-center gap-2 rounded-3xl border-2 px-8 py-8"
    >
      <Star class="text-primary size-[30px] fill-current" aria-hidden="true" />
      <p class="text-[15px] font-bold">{{ t('jobChange.celebrate') }}</p>
      <p class="text-primary text-lg font-bold">{{ props.name }}</p>
    </div>
  </div>
</template>
