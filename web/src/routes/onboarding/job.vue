<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AuthLayout from '@/components/auth/AuthLayout.vue';
import JobSelectForm from '@/components/auth/JobSelectForm.vue';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

async function onBack(): Promise<void> {
  if (!globalThis.confirm(t('auth.job.unsavedBack'))) {
    return;
  }

  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <AuthLayout wide show-back @back="onBack">
    <JobSelectForm />
  </AuthLayout>
</template>
