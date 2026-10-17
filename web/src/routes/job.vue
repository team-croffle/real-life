<script setup lang="ts">
import type { JobChangeStatus, JobClass } from '@nest-vue/shared';
import { JOB_CLASSES, JOB_CLASS_REWARD_MULTIPLIERS } from '@nest-vue/shared';
import { Briefcase, GraduationCap, Sparkles, TriangleAlert } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import JobChangeCard from '@/components/job/JobChangeCard.vue';
import JobChangeCelebrate from '@/components/job/JobChangeCelebrate.vue';
import JobChangeConfirmDialog from '@/components/job/JobChangeConfirmDialog.vue';
import AppShell from '@/components/layouts/AppShell.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { changeJobClass, getJobChangeStatus } from '@/lib/jobChange';

type PageState = 'loading' | 'ready' | 'error';

const JOB_ACCENTS: Record<JobClass, 'accent' | 'intel' | 'emo'> = {
  student: 'accent',
  office_worker: 'intel',
  freelancer: 'emo',
};

const BONUS_STATS = ['intellect', 'stamina', 'sense'] as const;

const { t, locale } = useI18n();

const pageState = ref<PageState>('loading');
const status = ref<JobChangeStatus | null>(null);
const pendingJob = ref<JobClass | null>(null);
const changePending = ref(false);
const changeError = ref('');
const celebrateName = ref('');

let loadGeneration = 0;
let leftJob = false;

const coolingDown = computed(() => {
  const nextAt = status.value?.nextJobChangeAt;
  if (!nextAt) {
    return false;
  }
  return Date.now() < new Date(nextAt).getTime();
});

const nextChangeLabel = computed(() => {
  const nextAt = status.value?.nextJobChangeAt;
  if (!nextAt || !coolingDown.value) {
    return '';
  }
  const time = new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(nextAt));
  return t('jobChange.nextChange', { time });
});

function bonusText(jobClass: JobClass): string {
  const multipliers = JOB_CLASS_REWARD_MULTIPLIERS[jobClass];
  return BONUS_STATS.flatMap((stat) => {
    const rate = multipliers[stat];
    if (rate === undefined) {
      return [];
    }
    return [t('jobChange.bonus', { stat: t(`jobChange.${stat}`), rate })];
  }).join(', ');
}

function onSelect(jobClass: JobClass): void {
  if (
    !status.value ||
    status.value.jobClass === jobClass ||
    coolingDown.value ||
    changePending.value
  ) {
    return;
  }
  changeError.value = '';
  pendingJob.value = jobClass;
}

function onCancel(): void {
  if (changePending.value) {
    return;
  }
  pendingJob.value = null;
  changeError.value = '';
}

async function onConfirm(): Promise<void> {
  const jobClass = pendingJob.value;
  if (!jobClass || changePending.value) {
    return;
  }
  changePending.value = true;
  changeError.value = '';
  try {
    const result = await changeJobClass(jobClass);
    if (leftJob) {
      return;
    }
    status.value = {
      jobClass: result.jobClass,
      jobClassChangedAt: result.jobClassChangedAt,
      nextJobChangeAt: result.nextJobChangeAt,
    };
    celebrateName.value = t(`auth.jobs.${result.jobClass}`);
    pendingJob.value = null;
  } catch (cause) {
    if (leftJob) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 400) {
      changeError.value = t('jobChange.unchanged');
      return;
    }
    if (cause instanceof ApiError && cause.status === 409) {
      changeError.value = t('jobChange.cooldownError');
      return;
    }
    changeError.value = t('jobChange.changeError');
  } finally {
    changePending.value = false;
  }
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || changePending.value) {
    return;
  }
  if (pendingJob.value) {
    onCancel();
    return;
  }
  celebrateName.value = '';
}

async function loadStatus(): Promise<void> {
  const generation = ++loadGeneration;
  pageState.value = 'loading';
  try {
    const next = await getJobChangeStatus();
    if (generation !== loadGeneration || leftJob) {
      return;
    }
    status.value = next;
    pageState.value = 'ready';
  } catch (cause) {
    if (generation !== loadGeneration || leftJob) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    pageState.value = 'error';
  }
}

onMounted(() => {
  void loadStatus();
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  leftJob = true;
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <AppShell>
    <div>
      <h1 class="mb-5 text-2xl font-bold">{{ t('jobChange.title') }}</h1>

      <div
        v-if="pageState === 'loading'"
        class="bg-surface border-border h-24 animate-pulse rounded-[18px] border"
      />
      <div
        v-else-if="pageState === 'error'"
        class="bg-surface border-border flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">
          {{ t('jobChange.loadError') }}
        </p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadStatus">
          {{ t('jobChange.retry') }}
        </Button>
      </div>
      <template v-else-if="status">
        <div
          class="bg-surface border-border mb-6 flex flex-wrap items-center justify-between gap-2.5 rounded-[18px] border px-[22px] py-5"
        >
          <div>
            <p class="text-muted-foreground mb-1 text-[11.5px]">{{ t('jobChange.current') }}</p>
            <p class="text-base font-bold">{{ t(`auth.jobs.${status.jobClass}`) }}</p>
          </div>
          <span
            v-if="nextChangeLabel"
            class="bg-muted text-secondary-foreground rounded-full px-3 py-1.5 text-[11.5px] font-bold"
          >
            {{ nextChangeLabel }}
          </span>
        </div>

        <h2 class="mb-3 text-sm font-bold">{{ t('jobChange.choose') }}</h2>
        <div class="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <JobChangeCard
            v-for="jobClass in JOB_CLASSES"
            :key="jobClass"
            :job-class="jobClass"
            :name="t(`auth.jobs.${jobClass}`)"
            :description="bonusText(jobClass)"
            :current="status.jobClass === jobClass"
            :disabled="status.jobClass === jobClass || coolingDown"
            :accent="JOB_ACCENTS[jobClass]"
            @select="onSelect"
          >
            <template #icon>
              <GraduationCap v-if="jobClass === 'student'" class="text-primary size-[19px]" />
              <Briefcase v-else-if="jobClass === 'office_worker'" class="text-intel size-[19px]" />
              <Sparkles v-else class="text-emo size-[19px]" />
            </template>
          </JobChangeCard>
        </div>
      </template>
    </div>
    <JobChangeConfirmDialog
      v-if="pendingJob"
      :name="t(`auth.jobs.${pendingJob}`)"
      :pending="changePending"
      :error="changeError"
      @cancel="onCancel"
      @confirm="onConfirm"
    />
    <JobChangeCelebrate v-if="celebrateName" :name="celebrateName" @close="celebrateName = ''" />
  </AppShell>
</template>
