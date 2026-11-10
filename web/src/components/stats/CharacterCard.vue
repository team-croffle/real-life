<script setup lang="ts">
import type { JobClass, Progress } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import CharacterFigure from '@/components/character/CharacterFigure.vue';

const props = defineProps<{
  jobClass: JobClass | null;
  jobLabel: string;
  nickname: string;
  progress: Progress;
}>();

const { t } = useI18n();

const titleText = computed(() => {
  const marks = props.progress.titleMarks;
  if (marks.length === 0) {
    return '';
  }
  return t('home.titleReached', { mark: Math.max(...marks) });
});

const xpWidth = computed(() => {
  if (props.progress.xpToNext === null) {
    return '100%';
  }
  if (props.progress.xpToNext <= 0) {
    return '0%';
  }
  const ratio = Math.min(
    100,
    Math.max(0, (props.progress.levelXp / props.progress.xpToNext) * 100),
  );
  return `${ratio}%`;
});

const lethargy = computed(() => props.progress.statusEffect === 'lethargy');
</script>

<template>
  <section class="bg-surface border-border overflow-hidden rounded-[18px] border">
    <div class="relative h-[180px]">
      <div class="bg-stage absolute inset-x-0 top-0 h-[62%]" />
      <div class="bg-auth-stage absolute inset-x-0 bottom-0 h-[38%]" />
      <div class="relative flex h-full flex-col items-center justify-end pb-3">
        <CharacterFigure class="h-[120px]" :job-class="jobClass" :lethargy="lethargy" />
      </div>
    </div>
    <div class="px-4 pt-3 pb-4">
      <p class="text-[13px] font-bold">
        {{ t('stats.characterName', { name: nickname }) }}
      </p>
      <div class="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          v-if="jobLabel"
          class="bg-surface border-border text-secondary-foreground rounded-full border px-3 py-1 text-[11px] font-bold"
        >
          {{ jobLabel }}
        </span>
        <span
          v-if="titleText"
          class="bg-surface border-border text-secondary-foreground rounded-full border px-3 py-1 text-[11px] font-bold"
        >
          {{ titleText }}
        </span>
      </div>
      <p class="mt-3 text-[12.5px] font-bold">{{ t('stats.level', { level: progress.level }) }}</p>
      <div class="bg-muted mt-2 h-2 overflow-hidden rounded-full" aria-hidden="true">
        <div class="bg-primary h-full" :style="{ width: xpWidth }" />
      </div>
    </div>
  </section>
</template>
