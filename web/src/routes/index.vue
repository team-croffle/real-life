<script setup lang="ts">
import type { Stats } from '@nest-vue/shared';
import { Plus, TriangleAlert } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CharacterStage from '@/components/home/CharacterStage.vue';
import SummaryCard from '@/components/home/SummaryCard.vue';
import TodayQuestCard from '@/components/home/TodayQuestCard.vue';
import AppShell from '@/components/layouts/AppShell.vue';
import QuestCompleteDialog from '@/components/quest/QuestCompleteDialog.vue';
import QuestRegisterDialog from '@/components/quest/QuestRegisterDialog.vue';
import { Button } from '@/components/ui/button';
import { useQuestBoard } from '@/composables/useQuestBoard';
import { getStats, getWallet } from '@/lib/home';
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
  busyId,
  toast,
  load,
  openComplete,
  onConfirmComplete,
  onMark,
  showToast,
} = useQuestBoard();

const stats = ref<Stats | null>(null);
const balance = ref<number | null>(null);
const registerOpen = ref(false);
const registerBusy = ref(false);

const jobLabel = computed(() => {
  const jobClass = user.value?.jobClass;
  return jobClass ? t(`auth.jobs.${jobClass}`) : '';
});

const todayQuests = computed(() => items.value.filter((item) => item.dueToday));

async function loadSummary(): Promise<void> {
  const [statsResult, walletResult] = await Promise.allSettled([getStats(), getWallet()]);
  if (statsResult.status === 'fulfilled') {
    stats.value = statsResult.value;
  }
  if (walletResult.status === 'fulfilled') {
    balance.value = walletResult.value.balance;
  }
}

async function onHomeComplete(note: string): Promise<void> {
  const completed = await onConfirmComplete(note);
  if (completed) {
    await loadSummary();
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
  if (registerBusy.value) {
    return;
  }
  registerOpen.value = false;
}

onMounted(() => {
  void load();
  void loadSummary();
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
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
          <p class="text-secondary-foreground mt-1 text-sm">{{ t('home.subtitle') }}</p>
        </div>
        <Button type="button" class="w-auto shrink-0 gap-2 px-5" @click="registerOpen = true">
          <Plus class="size-4" />
          {{ t('quest.add') }}
        </Button>
      </div>

      <div class="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(240px,0.85fr)]">
        <CharacterStage :job-label="jobLabel" />
        <SummaryCard :stats="stats" :balance="balance" />
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
          <p class="text-secondary-foreground text-sm font-semibold">{{ t('quest.loadError') }}</p>
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

    <p
      v-if="toast"
      class="bg-foreground text-background fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold md:bottom-8"
    >
      {{ toast }}
    </p>
  </AppShell>
</template>
