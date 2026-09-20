<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';

const { t } = useI18n();
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-6">
      <div>
        <h2 class="text-2xl font-semibold">{{ t('home.heading') }}</h2>
        <p class="text-secondary-foreground mt-2">{{ t('home.body') }}</p>
      </div>
    </div>
  </AppShell>
</template>
