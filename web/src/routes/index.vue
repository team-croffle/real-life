<script setup lang="ts">
import type { Stats } from '@nest-vue/shared';
import { Plus } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import CharacterStage from '@/components/home/CharacterStage.vue';
import SummaryCard from '@/components/home/SummaryCard.vue';
import AppShell from '@/components/layouts/AppShell.vue';
import QuestRegisterDialog from '@/components/quest/QuestRegisterDialog.vue';
import { Button } from '@/components/ui/button';
import { getStats, getWallet } from '@/lib/home';
import { useAuthStore } from '@/stores/auth';

const { t } = useI18n();
const auth = useAuthStore();
const { user } = storeToRefs(auth);

const stats = ref<Stats | null>(null);
const balance = ref<number | null>(null);
const registerOpen = ref(false);
const registerBusy = ref(false);

const jobLabel = computed(() => {
  const jobClass = user.value?.jobClass;
  return jobClass ? t(`auth.jobs.${jobClass}`) : '';
});

async function loadSummary(): Promise<void> {
  const [statsResult, walletResult] = await Promise.allSettled([getStats(), getWallet()]);
  if (statsResult.status === 'fulfilled') {
    stats.value = statsResult.value;
  }
  if (walletResult.status === 'fulfilled') {
    balance.value = walletResult.value.balance;
  }
}

async function onCreated(): Promise<void> {
  await loadSummary();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || registerBusy.value) {
    return;
  }
  registerOpen.value = false;
}

onMounted(() => {
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
    </div>

    <QuestRegisterDialog
      :open="registerOpen"
      @close="registerOpen = false"
      @created="onCreated"
      @busy="registerBusy = $event"
    />
  </AppShell>
</template>
