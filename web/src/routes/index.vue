<script setup lang="ts">
import type { Progress, Stats } from '@nest-vue/shared';
import { Plus, TriangleAlert } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CharacterStage from '@/components/home/CharacterStage.vue';
import SummaryCard from '@/components/home/SummaryCard.vue';
import TodayQuestCard from '@/components/home/TodayQuestCard.vue';
import AppShell from '@/components/layouts/AppShell.vue';
import QuestCompleteDialog from '@/components/quest/QuestCompleteDialog.vue';
import QuestCompleteResultDialog from '@/components/quest/QuestCompleteResultDialog.vue';
import QuestRegisterDialog from '@/components/quest/QuestRegisterDialog.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { useQuestBoard } from '@/composables/useQuestBoard';
import { getProgress, settleQuestPenalties } from '@/lib/home';
import { getStats } from '@/lib/stats';
import { getWallet } from '@/lib/wallet';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const { user } = storeToRefs(auth);
const {
  items,
  view,
  completeItem,
  completeError,
  completePending,
  completeId,
  completionResult,
  busyId,
  toast,
  load,
  openComplete,
  dismissCompletionResult,
  onConfirmComplete,
  onMark,
  showToast,
} = useQuestBoard();

const SETTLE_TIMEOUT_MS = 10_000;

const stats = ref<Stats | null>(null);
const balance = ref<number | null>(null);
const progress = ref<Progress | null>(null);
const registerOpen = ref(false);
const registerBusy = ref(false);

// 홈 배너. 정산과 진행도·지갑 조회가 끝나면 사라진다. 실패하면 한 번 더 시도한 뒤 실패를 띄운다.
type HomeLoadState = 'ready' | 'settling' | 'retrying' | 'failed';
const homeLoad = ref<HomeLoadState>('settling');

const jobLabel = computed(() => {
  const jobClass = user.value?.jobClass;
  return jobClass ? t(`auth.jobs.${jobClass}`) : '';
});

const todayQuests = computed(() => items.value.filter((item) => item.dueToday));

let statsGeneration = 0;
let walletGeneration = 0;
let progressGeneration = 0;
let settleAbort: AbortController | undefined;
let settleTimer: ReturnType<typeof setTimeout> | undefined;
let leftHome = false;

async function loadStats(): Promise<void> {
  const generation = ++statsGeneration;
  try {
    const next = await getStats();
    if (generation !== statsGeneration || leftHome) {
      return;
    }
    stats.value = next;
  } catch {
    // 실패한 조회는 직전 값을 유지한다.
  }
}

/** 성공하면 true. 실패하면 직전 값을 유지하고 false를 돌려준다. */
async function loadWallet(): Promise<boolean> {
  const generation = ++walletGeneration;
  try {
    const next = await getWallet();
    if (generation !== walletGeneration || leftHome) {
      return true;
    }
    balance.value = next.balance;
    return true;
  } catch {
    return false;
  }
}

/** 성공하면 true. 실패하면 직전 값을 유지하고 false를 돌려준다. */
async function loadProgress(): Promise<boolean> {
  const generation = ++progressGeneration;
  try {
    const next = await getProgress();
    if (generation !== progressGeneration || leftHome) {
      return true;
    }
    progress.value = next;
    return true;
  } catch {
    return false;
  }
}

async function loadSummary(): Promise<void> {
  await Promise.all([loadStats(), loadWallet()]);
}

async function settleThenRead(canRetry = true): Promise<void> {
  settleAbort?.abort();
  clearTimeout(settleTimer);
  const controller = new AbortController();
  settleAbort = controller;
  const timer = setTimeout(() => controller.abort(), SETTLE_TIMEOUT_MS);
  settleTimer = timer;
  homeLoad.value = canRetry ? 'settling' : 'retrying';
  let settled = true;
  try {
    await settleQuestPenalties(controller.signal);
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    settled = false;
  } finally {
    clearTimeout(timer);
  }
  if (leftHome || settleAbort !== controller) {
    return;
  }
  const [progressRead, walletRead] = await Promise.all([loadProgress(), loadWallet()]);
  if (leftHome || settleAbort !== controller) {
    return;
  }
  if (settled && progressRead && walletRead) {
    homeLoad.value = 'ready';
    return;
  }
  if (canRetry) {
    await settleThenRead(false);
    return;
  }
  homeLoad.value = 'failed';
}

/** 실패 배너의 새로고침. 퀘스트 목록, 스탯, 정산을 처음부터 다시 한다. */
function refreshHome(): void {
  void load();
  void loadStats();
  void settleThenRead();
}

async function onHomeComplete(note: string): Promise<void> {
  const completed = await onConfirmComplete(note);
  if (completed) {
    await Promise.all([loadProgress(), loadSummary()]);
  }
}

async function onCreated(title: string): Promise<void> {
  await load(true);
  showToast(t('quest.toast.created', { title }));
  await loadSummary();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }
  if (completeId.value) {
    if (!completePending.value) {
      completeId.value = null;
    }
    return;
  }
  if (completionResult.value) {
    dismissCompletionResult();
    return;
  }
  if (registerBusy.value) {
    return;
  }
  registerOpen.value = false;
}

onMounted(() => {
  void load();
  void loadStats();
  void settleThenRead();
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  leftHome = true;
  clearTimeout(settleTimer);
  settleAbort?.abort();
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <AppShell>
    <div>
      <div class="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('home.greeting', { name: user?.nickname ?? '' }) }}
          </h1>
          <p class="text-secondary-foreground mt-1 text-sm">
            {{ t('home.subtitle') }}
          </p>
        </div>
        <Button type="button" class="w-auto shrink-0 gap-2 px-5" @click="registerOpen = true">
          <Plus class="size-4" />
          {{ t('quest.add') }}
        </Button>
      </div>

      <div
        v-if="homeLoad !== 'ready'"
        class="mb-4 flex items-center justify-between gap-3 rounded-[14px] px-4 py-[11px] text-[12.5px] font-bold"
        :class="
          homeLoad === 'failed'
            ? 'bg-destructive/10 text-destructive'
            : 'bg-muted text-secondary-foreground'
        "
        role="status"
      >
        <span>{{ t(`home.load.${homeLoad}`) }}</span>
        <Button
          v-if="homeLoad === 'failed'"
          type="button"
          variant="outline"
          size="sm"
          class="w-auto px-3"
          @click="refreshHome"
        >
          {{ t('home.load.refresh') }}
        </Button>
      </div>

      <div class="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.85fr)]">
        <CharacterStage :job-label="jobLabel" :progress="progress" />
        <SummaryCard :stats="stats" :balance="balance" :progress="progress" />
      </div>

      <section class="mt-8">
        <h2 class="mb-3 text-sm font-bold">{{ t('home.questsTitle') }}</h2>

        <div v-if="view === 'loading'" class="flex flex-col gap-2.5">
          <div
            v-for="index in 3"
            :key="index"
            class="bg-surface border-border h-12 animate-pulse rounded-[14px] border"
            :style="{ animationDelay: `${(index - 1) * 0.12}s` }"
          />
        </div>

        <div
          v-else-if="view === 'error'"
          class="flex flex-col items-center gap-3 px-5 py-12 text-center"
        >
          <TriangleAlert class="text-destructive size-[34px]" />
          <p class="text-secondary-foreground text-sm font-semibold">
            {{ t('quest.loadError') }}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-4"
            @click="load(false)"
          >
            {{ t('quest.retry') }}
          </Button>
        </div>

        <p
          v-else-if="todayQuests.length === 0"
          class="text-secondary-foreground text-sm font-semibold"
        >
          {{ t('home.questsEmpty') }}
        </p>

        <div v-else class="flex flex-col gap-2.5">
          <TodayQuestCard
            v-for="item in todayQuests"
            :key="item.id"
            :item="item"
            :busy="busyId === item.id"
            @complete="openComplete(item.id)"
            @mark="onMark(item.id)"
          />
        </div>
      </section>
    </div>

    <QuestRegisterDialog
      :open="registerOpen"
      @close="registerOpen = false"
      @created="onCreated"
      @busy="registerBusy = $event"
    />

    <QuestCompleteDialog
      v-if="completeItem"
      :item="completeItem"
      :pending="completePending"
      :error="completeError"
      @cancel="completeId = null"
      @confirm="onHomeComplete"
    />

    <QuestCompleteResultDialog
      v-if="completionResult"
      :result="completionResult"
      @close="dismissCompletionResult"
    />

    <p
      v-if="toast"
      class="bg-foreground text-background fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold md:bottom-8"
    >
      {{ toast }}
    </p>
  </AppShell>
</template>
