<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import { Button } from '@/components/ui/button';
import { authErrorI18nKey } from '@/lib/authErrors';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const { pendingEmail, devVerifyToken } = storeToRefs(auth);

const pending = ref(false);
const formError = ref('');
const resent = ref(false);
const isDev = import.meta.env.DEV;

async function onResend(): Promise<void> {
  if (!pendingEmail.value) {
    return;
  }

  pending.value = true;
  formError.value = '';
  resent.value = false;
  try {
    await auth.resendVerification(pendingEmail.value);
    resent.value = true;
  } catch (error) {
    formError.value = t(authErrorI18nKey(error));
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1.5 text-xl font-bold">{{ t('auth.checkEmail.title') }}</h1>
    <p class="text-muted-foreground mb-7 text-[12.5px]">
      {{ t('auth.checkEmail.subtitle', { email: pendingEmail ?? '' }) }}
    </p>

    <p v-if="formError" class="text-destructive mb-3 text-[12px]" role="alert">{{ formError }}</p>
    <p v-if="resent" class="text-primary mb-3 text-[12px]">{{ t('auth.checkEmail.resent') }}</p>

    <Button type="button" class="mb-3.5" :disabled="pending" @click="onResend">
      <Loader2 v-if="pending" class="animate-spin" />
      {{ t('auth.checkEmail.resend') }}
    </Button>

    <Button
      v-if="isDev && devVerifyToken"
      type="button"
      variant="outline"
      size="sm"
      class="mb-5"
      as-child
    >
      <RouterLink :to="{ path: '/verify-email', query: { token: devVerifyToken } }">
        {{ t('auth.checkEmail.devVerify') }}
      </RouterLink>
    </Button>

    <p class="text-muted-foreground text-center text-xs">
      <RouterLink to="/login" class="text-primary font-bold no-underline">
        {{ t('auth.checkEmail.backToLogin') }}
      </RouterLink>
    </p>
  </div>
</template>
