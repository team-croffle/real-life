<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';

import LocaleSwitcher from '@/components/LocaleSwitcher.vue';

const { t } = useI18n();
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
    <header
      class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800"
    >
      <div>
        <h1 class="text-xl font-bold">{{ t('app.title') }}</h1>
        <p class="text-sm text-slate-500">{{ t('app.description') }}</p>
      </div>
      <LocaleSwitcher />
    </header>

    <nav class="flex gap-4 text-sm">
      <RouterLink to="/" class="hover:underline">{{ t('nav.home') }}</RouterLink>
      <RouterLink to="/about" class="hover:underline">{{ t('nav.about') }}</RouterLink>
    </nav>

    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
