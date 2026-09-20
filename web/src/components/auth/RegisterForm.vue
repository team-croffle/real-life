<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidEmail, isValidNickname, isValidPassword } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const fromLogin = route.meta.fromPath === '/login';

if (fromLogin) {
  auth.clearEmailDraft();
}

const draft = fromLogin ? null : auth.emailDraft;

const nickname = ref(draft?.nickname ?? '');
const email = ref(draft?.email ?? '');
const password = ref(draft?.password ?? '');
const nicknameError = ref('');
const emailError = ref('');
const passwordError = ref('');

function validate(): boolean {
  nicknameError.value = isValidNickname(nickname.value) ? '' : t('auth.errors.invalidNickname');
  emailError.value = isValidEmail(email.value) ? '' : t('auth.errors.invalidEmail');
  passwordError.value = isValidPassword(password.value) ? '' : t('auth.errors.invalidPassword');
  return !nicknameError.value && !emailError.value && !passwordError.value;
}

function onSubmit(): void {
  if (!validate()) {
    return;
  }

  auth.saveEmailDraft({
    nickname: nickname.value.trim(),
    email: email.value.trim(),
    password: password.value,
  });
  void router.push('/onboarding/job');
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

      <Button type="submit" class="mb-5">{{ t('auth.register.submit') }}</Button>
    </form>

    <p class="text-muted-foreground text-center text-xs">
      {{ t('auth.register.switch') }}
      <RouterLink to="/login" class="text-primary font-bold no-underline">
        {{ t('auth.register.switchAction') }}
      </RouterLink>
    </p>
  </div>
</template>
