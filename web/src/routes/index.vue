<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import HealthCard from '@/components/HealthCard.vue';

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="text-2xl font-semibold">{{ t('home.heading') }}</h2>
      <p class="mt-2 text-slate-600 dark:text-slate-400">{{ t('home.body') }}</p>
    </div>

    <HealthCard />
  </div>
</template>
