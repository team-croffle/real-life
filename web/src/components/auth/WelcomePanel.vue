<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { user } = storeToRefs(auth);

function onStart(): void {
  auth.clearJustOnboarded();
  void router.push('/');
}
</script>

<template>
  <div class="flex flex-col items-center pt-[60px] text-center">
    <svg
      width="60"
      height="60"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      class="text-primary"
      aria-hidden="true"
    >
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
    <h1 class="mt-4 mb-1.5 text-[19px] font-bold">{{ t('auth.welcome.title') }}</h1>
    <p class="text-secondary-foreground mb-[26px] text-[12.5px]">
      {{ t('auth.welcome.subtitle', { job: user ? t(`auth.jobs.${user.jobClass}`) : '' }) }}
    </p>
    <Button type="button" @click="onStart">{{ t('auth.welcome.submit') }}</Button>
  </div>
</template>
