<script setup lang="ts">
import type { Stats, StatusEffect } from '@nest-vue/shared';
import { CircleAlert, TriangleAlert } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import StatRadar from '@/components/stats/StatRadar.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { getProgress } from '@/lib/home';
import { getStats } from '@/lib/stats';

type SectionState = 'loading' | 'ready' | 'error';

const { t } = useI18n();

const stats = ref<Stats | null>(null);
const statsState = ref<SectionState>('loading');
const statusEffect = ref<StatusEffect | null>(null);
const progressState = ref<SectionState>('loading');

let statsGeneration = 0;
let progressGeneration = 0;
let leftStats = false;

async function loadStats(): Promise<void> {
  const generation = ++statsGeneration;
  statsState.value = 'loading';
  try {
    const next = await getStats();
    if (generation !== statsGeneration || leftStats) {
      return;
    }
    stats.value = next;
    statsState.value = 'ready';
  } catch (cause) {
    if (generation !== statsGeneration || leftStats) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    statsState.value = 'error';
  }
}

async function loadProgress(): Promise<void> {
  const generation = ++progressGeneration;
  progressState.value = 'loading';
  try {
    const next = await getProgress();
    if (generation !== progressGeneration || leftStats) {
      return;
    }
    statusEffect.value = next.statusEffect;
    progressState.value = 'ready';
  } catch (cause) {
    if (generation !== progressGeneration || leftStats) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    progressState.value = 'error';
  }
}

onMounted(() => {
  void loadStats();
  void loadProgress();
});

onUnmounted(() => {
  leftStats = true;
});
</script>

<template>
  <AppShell>
    <div>
      <h1 class="mb-5 text-2xl font-bold">{{ t('nav.stats') }}</h1>

      <div
        v-if="progressState === 'error'"
        class="border-border mb-4 flex flex-col items-center gap-3 rounded-[12px] border px-5 py-6 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">
          {{ t('stats.progressLoadError') }}
        </p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadProgress">
          {{ t('stats.retry') }}
        </Button>
      </div>
      <div
        v-else-if="progressState === 'ready' && statusEffect === 'lethargy'"
        class="border-destructive text-destructive mb-4 flex items-center gap-2 rounded-[12px] border px-3 py-2"
      >
        <CircleAlert class="size-[15px] shrink-0" />
        <p class="text-[11.5px] font-bold">{{ t('stats.statusLethargy') }}</p>
      </div>

      <div
        v-if="statsState === 'loading'"
        class="bg-surface border-border h-[220px] animate-pulse rounded-[18px] border"
      />
      <div
        v-else-if="statsState === 'error'"
        class="bg-surface border-border flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('stats.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadStats">
          {{ t('stats.retry') }}
        </Button>
      </div>
      <div
        v-else-if="stats"
        class="bg-surface border-border rounded-[18px] border px-[22px] py-[22px]"
      >
        <StatRadar :stats="stats" />
      </div>
    </div>
  </AppShell>
</template>
