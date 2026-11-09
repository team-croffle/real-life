<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  imageKey: string;
  size: 'thumb' | 'large';
}>();

const failed = ref(false);

watch(
  () => props.imageKey,
  () => {
    failed.value = false;
  },
);

const src = computed(() =>
  failed.value ? '/fallback/unknown.svg' : `/monsters/${props.imageKey}.svg`,
);

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
