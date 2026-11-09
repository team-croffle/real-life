<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    imageKey: string;
    size: 'thumb' | 'large';
    variant?: 'monster' | 'boss';
  }>(),
  { variant: 'monster' },
);

const failed = ref(false);

watch(
  () => [props.imageKey, props.variant],
  () => {
    failed.value = false;
  },
);

const src = computed(() => {
  if (failed.value) {
    return '/fallback/unknown.svg';
  }
  const folder = props.variant === 'boss' ? 'bosses' : 'monsters';
  return `/${folder}/${props.imageKey}.svg`;
});

function onError(): void {
  failed.value = true;
}
</script>

<template>
  <img
    :src="src"
    alt=""
    class="rounded-full object-cover"
    :class="size === 'thumb' ? 'size-[18px]' : 'size-24'"
    @error="onError"
  />
</template>
