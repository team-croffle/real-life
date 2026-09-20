<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';

const { t } = useI18n();
</script>

<template>
  <AppShell>
    <div class="flex flex-col gap-4">
      <h2 class="text-2xl font-semibold">{{ t('about.heading') }}</h2>
      <p class="text-secondary-foreground">{{ t('about.body') }}</p>

      <ul class="text-secondary-foreground list-inside list-disc text-sm">
        <li><code>server/</code> — NestJS 12 + Drizzle ORM</li>
        <li><code>web/</code> — Vue 3 + Vite + Tailwind CSS v4</li>
        <li><code>shared/</code> — 공용 타입 · 인터페이스 · 상수</li>
      </ul>
    </div>
  </AppShell>
</template>
