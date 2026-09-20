<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useGoogleAuth } from '@/composables/useGoogleAuth';
import { authErrorI18nKey, isEmailNotVerified, isUnauthorized } from '@/lib/authErrors';
import { isValidEmail, isValidPassword } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/auth';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { pending } = storeToRefs(auth);
const { available: googleAvailable, mountButton } = useGoogleAuth();
const googleHost = ref<HTMLElement | null>(null);
const googleMountError = ref(false);

const email = ref('');
const password = ref('');
const emailError = ref('');
const passwordError = ref('');
const formError = ref('');
const unverified = ref(false);
const googlePending = ref(false);
const resendPending = ref(false);
const resendDone = ref(false);

function validate(): boolean {
  emailError.value = isValidEmail(email.value) ? '' : t('auth.errors.invalidEmail');
  passwordError.value = isValidPassword(password.value) ? '' : t('auth.errors.invalidPassword');
  return !emailError.value && !passwordError.value;
}

async function onSubmit(): Promise<void> {
  formError.value = '';
  unverified.value = false;
  resendDone.value = false;
  if (!validate()) {
    return;
  }

  try {
    await auth.login({ email: email.value.trim(), password: password.value });
    await router.push('/');
  } catch (error) {
    unverified.value = isEmailNotVerified(error);
    formError.value = isUnauthorized(error)
      ? t('auth.errors.unauthorized')
      : t(authErrorI18nKey(error));
  }
}

async function onResend(): Promise<void> {
  resendPending.value = true;
  resendDone.value = false;
  try {
    await auth.resendVerification(email.value.trim());
    resendDone.value = true;
  } catch (error) {
    formError.value = t(authErrorI18nKey(error));
  } finally {
    resendPending.value = false;
  }
}

async function onGoogleCredential(idToken: string): Promise<void> {
  formError.value = '';
  unverified.value = false;
  googlePending.value = true;
  try {
    const result = await auth.loginWithGoogle(idToken);
    await router.push(result.needsOnboarding ? '/onboarding/job' : '/');
  } catch (error) {
    formError.value = isUnauthorized(error)
      ? t('auth.errors.googleFailed')
      : t(authErrorI18nKey(error));
  } finally {
    googlePending.value = false;
  }
}

async function renderGoogleButton(): Promise<void> {
  if (!googleAvailable) {
    return;
  }

  await nextTick();
  if (!googleHost.value) {
    return;
  }

  try {
    await mountButton(googleHost.value, {
      locale: locale.value,
      onCredential: (idToken) => {
        void onGoogleCredential(idToken);
      },
    });
    googleMountError.value = false;
  } catch {
    googleMountError.value = true;
  }
}

onMounted(() => {
  if (route.query.reason === 'onboardingExpired') {
    formError.value = t('auth.errors.onboardingExpired');
    void router.replace({ path: '/login' });
  }
  void renderGoogleButton();
});

watch(locale, () => {
  void renderGoogleButton();
});
</script>

<template>
  <div>
    <h1 class="mb-1.5 text-xl font-bold">{{ t('auth.login.title') }}</h1>
    <p class="text-muted-foreground mb-7 text-[12.5px]">{{ t('auth.login.subtitle') }}</p>

    <form class="flex flex-col" @submit.prevent="onSubmit">
      <div class="mb-3.5 flex flex-col gap-0.5">
        <Label for="login-email">{{ t('auth.fields.email') }}</Label>
        <Input
          id="login-email"
          v-model="email"
          type="email"
          autocomplete="email"
          :aria-invalid="Boolean(emailError)"
        />
        <p v-if="emailError" class="text-destructive text-[11px]">{{ emailError }}</p>
      </div>

      <div class="mb-[22px] flex flex-col gap-0.5">
        <Label for="login-password">{{ t('auth.fields.password') }}</Label>
        <Input
          id="login-password"
          v-model="password"
          type="password"
          autocomplete="current-password"
          :aria-invalid="Boolean(passwordError)"
        />
        <p v-if="passwordError" class="text-destructive text-[11px]">{{ passwordError }}</p>
      </div>

      <p v-if="formError" class="text-destructive mb-3 text-[12px]" role="alert">{{ formError }}</p>
      <p v-if="resendDone" class="text-primary mb-3 text-[12px]">
        {{ t('auth.checkEmail.resent') }}
      </p>

      <Button type="submit" class="mb-3.5" :disabled="pending">
        <Loader2 v-if="pending" class="animate-spin" />
        {{ t('auth.login.submit') }}
      </Button>

      <Button
        v-if="unverified"
        type="button"
        variant="outline"
        class="mb-3.5"
        :disabled="resendPending"
        @click="onResend"
      >
        <Loader2 v-if="resendPending" class="animate-spin" />
        {{ t('auth.checkEmail.resend') }}
      </Button>
    </form>

    <div class="my-[18px] flex items-center gap-2.5">
      <Separator class="flex-1" />
      <span class="text-muted-foreground text-[11px]">{{ t('auth.or') }}</span>
      <Separator class="flex-1" />
    </div>

    <div class="relative mb-5">
      <div
        v-if="googleAvailable && !googleMountError"
        ref="googleHost"
        class="min-h-10 w-full"
        :aria-label="t('auth.login.google')"
      />
      <Button v-else type="button" variant="outline" size="sm" disabled>
        {{ t('auth.login.google') }}
      </Button>
      <div
        v-if="googlePending"
        class="bg-background/80 absolute inset-0 flex items-center justify-center"
      >
        <Loader2 class="animate-spin" />
      </div>
    </div>
    <p
      v-if="!googleAvailable || googleMountError"
      class="text-muted-foreground -mt-2 mb-5 text-center text-[11px]"
    >
      {{ t('auth.errors.googleUnavailable') }}
    </p>

    <p class="text-muted-foreground text-center text-xs">
      {{ t('auth.login.switch') }}
      <RouterLink to="/register" class="text-primary font-bold no-underline">
        {{ t('auth.login.switchAction') }}
      </RouterLink>
    </p>
  </div>
</template>
