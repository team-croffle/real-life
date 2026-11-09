<script setup lang="ts">
import type { UnseenBossResult } from '@nest-vue/shared';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import MonsterImage from '@/components/quest/MonsterImage.vue';
import { Button } from '@/components/ui/button';
import { markBossSeen } from '@/lib/bosses';
import { clearConfetti, fireConfetti } from '@/lib/confetti';
import { advanceUnseenBoss, currentUnseenBoss, ensureUnseenBossesLoaded } from '@/lib/unseenBosses';

const LOOT_GAP_MS = 300;

const { t } = useI18n();

const current = ref<UnseenBossResult | null>(null);
const lootOpen = ref(false);
const shownLoot = ref(0);
const seenSent = ref(false);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let lootTimer: ReturnType<typeof setTimeout> | undefined;

const lostGold = computed(() => Math.abs(current.value?.gold ?? 0));
const lostXp = computed(() => Math.abs(current.value?.xp ?? 0));
const lootTotal = computed(() => (current.value?.xp === null ? 2 : 3));

function clearLootTimer(): void {
  if (lootTimer !== undefined) {
    clearTimeout(lootTimer);
    lootTimer = undefined;
  }
}

function showCurrent(): void {
  clearLootTimer();
  current.value = currentUnseenBoss();
  lootOpen.value = false;
  shownLoot.value = 0;
  seenSent.value = false;
}

async function boot(): Promise<void> {
  await ensureUnseenBossesLoaded();
  showCurrent();
}

function markSeenOnce(): void {
  const boss = current.value;
  if (!boss || seenSent.value) {
    return;
  }
  seenSent.value = true;
  void markBossSeen(boss.id);
}

function celebrateClear(): void {
  if (reduceMotion || current.value?.result !== 'cleared') {
    return;
  }
  fireConfetti('jackpot');
}

function closeCurrent(): void {
  markSeenOnce();
  advanceUnseenBoss();
  showCurrent();
}

function revealLoot(): void {
  const total = lootTotal.value;
  if (reduceMotion) {
    shownLoot.value = total;
    return;
  }
  shownLoot.value = 1;
  const step = (): void => {
    if (shownLoot.value >= total) {
      lootTimer = undefined;
      return;
    }
    shownLoot.value += 1;
    lootTimer = setTimeout(step, LOOT_GAP_MS);
  };
  lootTimer = setTimeout(step, LOOT_GAP_MS);
}

function onLoot(): void {
  markSeenOnce();
  lootOpen.value = true;
  revealLoot();
}

watch(current, (boss) => {
  if (boss?.result === 'cleared') {
    celebrateClear();
  }
});

onMounted(() => {
  void boot();
});

onUnmounted(() => {
  clearLootTimer();
  clearConfetti();
});
</script>

<template>
  <div
    v-if="current"
    class="fixed inset-0 z-50 flex items-center justify-center px-4"
    :class="current.result === 'failed' ? 'bg-overlay-strong' : 'bg-overlay'"
  >
    <button
      type="button"
      class="absolute inset-0"
      :aria-label="t('boss.close')"
      @click="closeCurrent"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 w-full max-w-[360px] overflow-hidden rounded-[22px] p-6 text-center shadow-xl"
      :class="current.result === 'cleared' && !reduceMotion ? 'boss-clear-glow' : ''"
    >
      <div
        v-if="current.result === 'failed' && !reduceMotion"
        class="boss-ember pointer-events-none absolute inset-x-0 bottom-0 h-16"
      />
      <p class="text-gold mb-3 text-[13px] font-bold">
        {{ current.result === 'cleared' ? t('boss.clearedTitle') : t('boss.failedTitle') }}
      </p>
      <div
        class="mb-3 flex justify-center"
        :class="current.result === 'failed' && !reduceMotion ? 'boss-shake' : ''"
      >
        <MonsterImage
          v-if="current.boss"
          :image-key="current.boss.imageKey"
          size="large"
          variant="boss"
        />
        <span
          v-else
          class="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-full text-2xl font-bold"
        >
          {{ t('boss.missingMark') }}
        </span>
      </div>
      <h2 class="text-[20px] font-bold">{{ current.boss?.name ?? current.title }}</h2>
      <p class="text-muted-foreground mt-1 mb-4 text-[12.5px]">
        {{ t('boss.goalLine', { goal: current.title }) }}
      </p>

      <template v-if="current.result === 'cleared'">
        <p v-if="!lootOpen" class="text-secondary-foreground mb-4 text-[13px]">
          {{ t('boss.clearedBody') }}
        </p>
        <div v-else class="mb-4 flex flex-col gap-1">
          <p
            v-if="shownLoot >= 1"
            class="text-gold text-[22px] font-bold"
            :class="reduceMotion ? '' : 'result-pop'"
          >
            {{ t('boss.lootGold', { gold: current.gold }) }}
          </p>
          <p
            v-if="current.xp !== null && shownLoot >= 2"
            class="text-[22px] font-bold"
            :class="reduceMotion ? '' : 'result-pop'"
          >
            {{ t('boss.lootXp', { xp: current.xp }) }}
          </p>
          <p
            v-if="shownLoot >= (current.xp === null ? 2 : 3)"
            class="text-gold text-[22px] font-bold"
            :class="reduceMotion ? '' : 'result-pop'"
          >
            {{ t('boss.lootTickets', { n: current.tickets }) }}
          </p>
        </div>
        <Button v-if="!lootOpen" type="button" class="w-full" @click="onLoot">
          {{ t('boss.loot') }}
        </Button>
        <Button v-else type="button" class="w-full" @click="closeCurrent">
          {{ t('boss.close') }}
        </Button>
      </template>

      <template v-else>
        <p class="text-destructive mb-1 text-[18px] font-bold">
          {{ t('boss.lostGold', { gold: lostGold }) }}
        </p>
        <p v-if="current.xp !== null" class="text-destructive mb-4 text-[18px] font-bold">
          {{ t('boss.lostXp', { xp: lostXp }) }}
        </p>
        <Button type="button" class="w-full" @click="closeCurrent">{{ t('boss.close') }}</Button>
      </template>
    </div>
  </div>
</template>
