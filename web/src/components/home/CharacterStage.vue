<script setup lang="ts">
import type { Progress } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  jobLabel: string;
  progress: Progress | null;
}>();

const { t } = useI18n();

const levelLine = computed(() =>
  t('home.levelLine', {
    level: props.progress ? String(props.progress.level) : '',
    job: props.jobLabel,
  }),
);

const titleText = computed(() => {
  if (!props.progress) {
    return t('home.titleBadge');
  }
  const marks = props.progress.titleMarks;
  if (marks.length === 0) {
    return '';
  }
  return t('home.titleReached', { mark: Math.max(...marks) });
});

const xpWidth = computed(() => {
  const progress = props.progress;
  if (!progress) {
    return '0%';
  }
  if (progress.xpToNext === null) {
    return '100%';
  }
  if (progress.xpToNext <= 0) {
    return '0%';
  }
  const ratio = Math.min(100, Math.max(0, (progress.levelXp / progress.xpToNext) * 100));
  return `${ratio}%`;
});

const statusLabel = computed(() =>
  props.progress?.statusEffect === 'lethargy' ? t('home.lethargy') : '',
);
</script>

<template>
  <section class="bg-surface border-border overflow-hidden rounded-[18px] border">
    <div class="relative h-[228px]">
      <div class="bg-stage absolute inset-x-0 top-0 h-[62%]" />
      <div class="bg-auth-stage absolute inset-x-0 bottom-0 h-[38%]" />
      <div class="relative flex h-full flex-col items-center justify-end pb-5">
        <p
          v-if="titleText"
          class="bg-surface border-border text-secondary-foreground rounded-full border px-3 py-1 text-[11px] font-bold"
        >
          {{ titleText }}
        </p>
        <p
          v-if="statusLabel"
          class="bg-surface border-border text-destructive mt-2 rounded-full border px-3 py-1 text-[11px] font-bold"
        >
          {{ statusLabel }}
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
        <div class="bg-primary h-full" :style="{ width: xpWidth }" />
      </div>
    </div>
  </section>
</template>
