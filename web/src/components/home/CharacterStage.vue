<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  jobLabel: string;
}>();

const { t } = useI18n();

const levelLine = computed(() =>
  props.jobLabel
    ? t('home.levelLine', { level: '', job: props.jobLabel })
    : t('home.levelLine', { level: '', job: '' }),
);
</script>

<template>
  <section class="bg-surface border-border overflow-hidden rounded-[18px] border">
    <div class="relative h-[228px]">
      <div class="bg-stage absolute inset-x-0 top-0 h-[62%]" />
      <div class="bg-auth-stage absolute inset-x-0 bottom-0 h-[38%]" />
      <div class="relative flex h-full flex-col items-center justify-end pb-5">
        <p
          class="bg-surface border-border text-secondary-foreground rounded-full border px-3 py-1 text-[11px] font-bold"
        >
          {{ t('home.titleBadge') }}
        </p>
        <div
          class="character-image border-border bg-surface/80 mt-3 size-[104px] rounded-[28px] border"
          role="img"
          :aria-label="t('home.characterLabel')"
        />
      </div>
    </div>
    <div class="px-4 pt-3 pb-4">
      <p class="text-center text-[13px] font-bold">{{ levelLine }}</p>
      <div class="bg-muted mt-2 h-2 overflow-hidden rounded-full" aria-hidden="true">
        <div class="bg-primary h-full w-0" />
      </div>
    </div>
  </section>
</template>
