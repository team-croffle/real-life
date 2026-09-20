<script setup lang="ts">
import type { LabelProps } from 'reka-ui';
import { Label as LabelPrimitive } from 'reka-ui';
import type { HTMLAttributes } from 'vue';

import { cn } from '@/lib/utils';

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>();
</script>

<template>
  <LabelPrimitive
    data-slot="label"
    v-bind="props"
    :class="cn('text-secondary-foreground text-[11.5px] font-semibold', props.class)"
  >
    <slot />
  </LabelPrimitive>
</template>
