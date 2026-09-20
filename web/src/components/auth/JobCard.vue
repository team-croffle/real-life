<script setup lang="ts">
import type { JobClass } from '@nest-vue/shared';
import { Check } from 'lucide-vue-next';

import { cn } from '@/lib/utils';

const props = defineProps<{
  jobClass: JobClass;
  name: string;
  description: string;
  selected: boolean;
  accent: 'accent' | 'intel' | 'emo';
}>();

const emit = defineEmits<{
  select: [jobClass: JobClass];
}>();

const accentColor: Record<'accent' | 'intel' | 'emo', string> = {
  accent: 'var(--accent)',
  intel: 'var(--intel)',
  emo: 'var(--emo)',
};
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'border-border bg-surface flex w-full items-center gap-3.5 rounded-2xl border-[1.5px] p-4 text-left',
        props.selected && 'border-[color:var(--card-accent)]',
      )
    "
    :style="{ '--card-accent': accentColor[props.accent] }"
    :aria-pressed="props.selected"
    @click="emit('select', props.jobClass)"
  >
    <div
      class="flex size-10 shrink-0 items-center justify-center rounded-xl"
      :style="{ background: `color-mix(in srgb, ${accentColor[props.accent]} 15%, transparent)` }"
    >
      <slot name="icon" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-[13.5px] font-bold">{{ props.name }}</p>
      <p class="text-muted-foreground text-[11px]">{{ props.description }}</p>
    </div>
    <Check
      v-if="props.selected"
      class="size-[18px] shrink-0"
      :style="{ color: accentColor[props.accent] }"
      aria-hidden="true"
    />
  </button>
</template>
