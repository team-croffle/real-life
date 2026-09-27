<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import AuthLayout from '@/components/auth/AuthLayout.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { authErrorI18nKey } from '@/lib/authErrors';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { verifyEmail } = useAuthStore();

const loading = ref(true);
const error = ref('');

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : '';
  if (!token) {
    error.value = t('auth.verify.missingToken');
    loading.value = false;
    return;
  }

  try {
    await verifyEmail(token);
    await router.replace('/onboarding/job');
  } catch (cause) {
    error.value =
      cause instanceof ApiError && cause.status === 401
        ? t('auth.verify.invalid')
        : t(authErrorI18nKey(cause));
    loading.value = false;
  }
});
</script>

<template>
  <AuthLayout back-to="/login">
    <div>
      <h1 class="mb-1.5 text-xl font-bold">{{ t('auth.verify.title') }}</h1>
      <p v-if="loading" class="text-muted-foreground text-[12.5px]">
        {{ t('auth.verify.loading') }}
      </p>
      <template v-else>
        <p class="text-destructive mb-7 text-[12.5px]" role="alert">{{ error }}</p>
        <Button type="button" variant="outline" size="sm" as-child>
          <RouterLink to="/login">{{ t('auth.checkEmail.backToLogin') }}</RouterLink>
        </Button>
      </template>
    </div>
  </AuthLayout>
</template>
