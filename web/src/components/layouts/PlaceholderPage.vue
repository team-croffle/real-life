<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  title: string;
}>();

const { t } = useI18n();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">{{ title }}</h1>
    <p class="text-secondary-foreground mt-2 text-sm">{{ t('placeholder.body') }}</p>
  </div>
</template>
