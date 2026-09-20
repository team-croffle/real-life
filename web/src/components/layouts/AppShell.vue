<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { RouterLink, RouterView } from 'vue-router';

import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import { Button } from '@/components/ui/button';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const { user, pending } = storeToRefs(auth);

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
    <header class="border-border flex items-center justify-between border-b pb-4">
      <div>
        <h1 class="text-xl font-bold">{{ t('app.title') }}</h1>
        <p class="text-secondary-foreground text-sm">{{ t('app.description') }}</p>
        <p v-if="user" class="text-muted-foreground mt-1 text-sm">
          {{ user.nickname }}#{{ user.tag }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <LocaleSwitcher />
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto px-4"
          :disabled="pending"
          @click="onLogout"
        >
          {{ t('auth.logout') }}
        </Button>
      </div>
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
