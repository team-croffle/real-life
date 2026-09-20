<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

import AuthLayout from '@/components/auth/AuthLayout.vue';
import JobSelectForm from '@/components/auth/JobSelectForm.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const { googleOnboardingToken } = storeToRefs(auth);

async function onBack(): Promise<void> {
  if (googleOnboardingToken.value) {
    auth.clearDraft();
    await router.push('/login');
    return;
  }

  await router.push('/register');
}
</script>

<template>
  <AuthLayout wide show-back @back="onBack">
    <JobSelectForm />
  </AuthLayout>
</template>
