<script setup lang="ts">
import type { JobClass } from '@nest-vue/shared';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  jobClass: JobClass;
  name: string;
  description: string;
  current: boolean;
  disabled: boolean;
  accent: 'accent' | 'intel' | 'emo';
}>();

const emit = defineEmits<{
  select: [jobClass: JobClass];
}>();

const { t } = useI18n();

const accentColor: Record<'accent' | 'intel' | 'emo', string> = {
  accent: 'var(--accent)',
  intel: 'var(--intel)',
  emo: 'var(--emo)',
};
</script>

<template>
  <div
    class="bg-surface flex flex-col gap-2.5 rounded-[18px] border-[1.5px] p-5"
    :class="props.current ? 'border-[color:var(--card-accent)]' : 'border-border'"
    :style="{ '--card-accent': accentColor[props.accent] }"
  >
    <div
      class="flex size-10 items-center justify-center rounded-xl"
      :style="{ background: `color-mix(in srgb, ${accentColor[props.accent]} 15%, transparent)` }"
    >
      <slot name="icon" />
    </div>
    <p class="text-[13.5px] font-bold">{{ props.name }}</p>
    <p class="text-muted-foreground flex-1 text-[11px] leading-normal">{{ props.description }}</p>
    <Button
      type="button"
      size="sm"
      class="hover:opacity-90"
      :style="{
        background: `color-mix(in srgb, ${accentColor[props.accent]} 15%, transparent)`,
        color: accentColor[props.accent],
      }"
      :disabled="props.disabled"
      @click="emit('select', props.jobClass)"
    >
      {{ t('jobChange.select') }}
    </Button>
  </div>
</template>
