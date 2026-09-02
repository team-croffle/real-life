<script setup lang="ts">
import { SUPPORTED_LOCALES, type SupportedLocale } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { setLocale } from '@/i18n';

const { t, locale } = useI18n();

const current = computed({
  get: () => locale.value as SupportedLocale,
  set: (value: SupportedLocale) => setLocale(value),
});
</script>

<template>
  <label class="flex items-center gap-2 text-sm">
    <span class="sr-only">{{ t('locale.label') }}</span>
    <select
      v-model="current"
      class="rounded-md border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-700"
    >
      <option v-for="value in SUPPORTED_LOCALES" :key="value" :value="value">
        {{ value.toUpperCase() }}
      </option>
    </select>
  </label>
</template>
