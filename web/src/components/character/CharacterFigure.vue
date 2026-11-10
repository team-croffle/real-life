<script setup lang="ts">
import type { JobClass } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { appearanceSrc } from '@/lib/characterAppearance';

const props = defineProps<{
  jobClass: JobClass | null;
  lethargy: boolean;
}>();

const { t } = useI18n();

const src = computed(() => appearanceSrc(props.jobClass));
</script>

<template>
  <img
    :src="src"
    :alt="t('home.characterLabel')"
    class="w-auto object-contain"
    :class="lethargy ? 'origin-bottom scale-y-[0.96] grayscale-[70%]' : 'origin-bottom'"
  />
</template>
