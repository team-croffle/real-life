<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-2xl font-semibold">{{ t('about.heading') }}</h2>
    <p class="text-slate-600 dark:text-slate-400">{{ t('about.body') }}</p>

    <ul class="list-inside list-disc text-sm text-slate-600 dark:text-slate-400">
      <li><code>server/</code> — NestJS 12 + Drizzle ORM</li>
      <li><code>web/</code> — Vue 3 + Vite + Tailwind CSS v4</li>
      <li><code>shared/</code> — 공용 타입 · 인터페이스 · 상수</li>
    </ul>
  </div>
</template>
