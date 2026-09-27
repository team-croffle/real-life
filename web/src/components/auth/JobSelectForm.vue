<script setup lang="ts">
import type { JobClass } from '@nest-vue/shared';
import { JOB_CLASSES } from '@nest-vue/shared';
import { Briefcase, GraduationCap, Loader2, Sparkles } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import JobCard from '@/components/auth/JobCard.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authErrorI18nKey, isUnauthorized } from '@/lib/authErrors';
import { isValidNickname } from '@/lib/authValidation';
import { useAuthStore } from '@/stores/auth';

const JOB_ACCENTS: Record<JobClass, 'accent' | 'intel' | 'emo'> = {
  student: 'accent',
  office_worker: 'intel',
  freelancer: 'emo',
};

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { pending, googleNicknamePrefill } = storeToRefs(auth);

const selected = ref<JobClass>('office_worker');
const nickname = ref(auth.user?.nickname || googleNicknamePrefill.value);
const nicknameError = ref('');
const formError = ref('');

function onSelect(jobClass: JobClass): void {
  selected.value = jobClass;
}

async function onSubmit(): Promise<void> {
  formError.value = '';
  nicknameError.value = '';

  if (!isValidNickname(nickname.value)) {
    nicknameError.value = t('auth.errors.invalidNickname');
    return;
  }

  try {
    await auth.completeOnboarding({
      nickname: nickname.value.trim(),
      jobClass: selected.value,
    });
    await router.push('/onboarding/complete');
  } catch (error) {
    if (isUnauthorized(error)) {
      return;
    }
    formError.value = t(authErrorI18nKey(error));
  }
}
</script>

<template>
  <div>
    <p class="text-primary mb-1.5 text-[11px] font-bold">{{ t('auth.job.step') }}</p>
    <h1 class="mb-1.5 text-xl font-bold">{{ t('auth.job.title') }}</h1>
    <p class="text-muted-foreground mb-7 text-[12.5px]">{{ t('auth.job.subtitle') }}</p>

    <div class="mb-3.5 flex flex-col gap-0.5">
      <Label for="onboarding-nickname">{{ t('auth.fields.nickname') }}</Label>
      <Input
        id="onboarding-nickname"
        v-model="nickname"
        type="text"
        autocomplete="nickname"
        maxlength="20"
        :aria-invalid="Boolean(nicknameError)"
      />
      <p v-if="nicknameError" class="text-destructive text-[11px]">{{ nicknameError }}</p>
    </div>

    <div class="mb-[26px] flex flex-col gap-2.5">
      <JobCard
        v-for="jobClass in JOB_CLASSES"
        :key="jobClass"
        :job-class="jobClass"
        :name="t(`auth.jobs.${jobClass}`)"
        :description="t('auth.job.rewardHint')"
        :selected="selected === jobClass"
        :accent="JOB_ACCENTS[jobClass]"
        @select="onSelect"
      >
        <template #icon>
          <GraduationCap v-if="jobClass === 'student'" class="text-primary size-[19px]" />
          <Briefcase v-else-if="jobClass === 'office_worker'" class="text-intel size-[19px]" />
          <Sparkles v-else class="text-emo size-[19px]" />
        </template>
      </JobCard>
    </div>

    <p v-if="formError" class="text-destructive mb-3 text-[12px]" role="alert">{{ formError }}</p>

    <Button type="button" :disabled="pending" @click="onSubmit">
      <Loader2 v-if="pending" class="animate-spin" />
      {{ t('auth.job.submit') }}
    </Button>
  </div>
</template>
