<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import AppShell from '@/components/layouts/AppShell.vue';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const { user } = storeToRefs(auth);
</script>

<template>
  <AppShell>
    <div>
      <h1 class="text-2xl font-bold">
        {{ t('home.greeting', { name: user?.nickname ?? '' }) }}
      </h1>
      <p class="text-secondary-foreground mt-1 text-sm">{{ t('home.subtitle') }}</p>

      <section class="bg-muted mt-8 rounded-[18px] px-5 py-8">
        <h2 class="text-sm font-bold">{{ t('home.questsTitle') }}</h2>
        <p class="text-muted-foreground mt-2 text-sm">{{ t('home.questsEmpty') }}</p>
        <RouterLink to="/quests" class="text-primary mt-4 inline-block text-sm font-bold">
          {{ t('home.openQuests') }}
        </RouterLink>
      </section>
    </div>
  </AppShell>
</template>
