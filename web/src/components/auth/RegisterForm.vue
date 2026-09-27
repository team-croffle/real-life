<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authErrorI18nKey } from '@/lib/authErrors';
import { isValidEmail, isValidNickname, isValidPassword } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();

const nickname = ref('');
const email = ref('');
const password = ref('');
const nicknameError = ref('');
const emailError = ref('');
const passwordError = ref('');
const formError = ref('');

function validate(): boolean {
  nicknameError.value = isValidNickname(nickname.value) ? '' : t('auth.errors.invalidNickname');
  emailError.value = isValidEmail(email.value) ? '' : t('auth.errors.invalidEmail');
  passwordError.value = isValidPassword(password.value) ? '' : t('auth.errors.invalidPassword');
  return !nicknameError.value && !emailError.value && !passwordError.value;
}

async function onSubmit(): Promise<void> {
  formError.value = '';
  if (!validate()) {
    return;
  }

  try {
    await auth.register({
      nickname: nickname.value.trim(),
      email: email.value.trim(),
      password: password.value,
    });
    await router.push('/register/check-email');
  } catch (error) {
    formError.value = t(authErrorI18nKey(error));
  }
}
</script>

<template>
  <div>
    <h1 class="mb-1.5 text-xl font-bold">{{ t('auth.register.title') }}</h1>
    <p class="text-muted-foreground mb-7 text-[12.5px]">{{ t('auth.register.subtitle') }}</p>

    <form class="flex flex-col" @submit.prevent="onSubmit">
      <div class="mb-3.5 flex flex-col gap-0.5">
        <Label for="register-nickname">{{ t('auth.fields.nickname') }}</Label>
        <Input
          id="register-nickname"
          v-model="nickname"
          type="text"
          autocomplete="nickname"
          maxlength="20"
          :placeholder="t('auth.placeholders.nickname')"
          :aria-invalid="Boolean(nicknameError)"
        />
        <p v-if="nicknameError" class="text-destructive text-[11px]">{{ nicknameError }}</p>
      </div>

      <div class="mb-3.5 flex flex-col gap-0.5">
        <Label for="register-email">{{ t('auth.fields.email') }}</Label>
        <Input
          id="register-email"
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="t('auth.placeholders.email')"
          :aria-invalid="Boolean(emailError)"
        />
        <p v-if="emailError" class="text-destructive text-[11px]">{{ emailError }}</p>
      </div>

      <div class="mb-[22px] flex flex-col gap-0.5">
        <Label for="register-password">{{ t('auth.fields.password') }}</Label>
        <Input
          id="register-password"
          v-model="password"
          type="password"
          autocomplete="new-password"
          :placeholder="t('auth.placeholders.password')"
          :aria-invalid="Boolean(passwordError)"
        />
        <p v-if="passwordError" class="text-destructive text-[11px]">{{ passwordError }}</p>
      </div>

      <p v-if="formError" class="text-destructive mb-3 text-[12px]" role="alert">{{ formError }}</p>

      <Button type="submit" class="mb-5" :disabled="auth.pending">
        <Loader2 v-if="auth.pending" class="animate-spin" />
        {{ t('auth.register.submit') }}
      </Button>
    </form>

    <p class="text-muted-foreground text-center text-xs">
      {{ t('auth.register.switch') }}
      <RouterLink to="/login" class="text-primary font-bold no-underline">
        {{ t('auth.register.switchAction') }}
      </RouterLink>
    </p>
  </div>
</template>
