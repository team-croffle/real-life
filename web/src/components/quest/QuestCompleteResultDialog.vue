<script setup lang="ts">
import { Check, Ticket } from '@lucide/vue';
import type { QuestCompletionResult } from '@nest-vue/shared';
import { computed, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import MonsterImage from '@/components/quest/MonsterImage.vue';
import { Button } from '@/components/ui/button';
import { clearConfetti, fireConfetti } from '@/lib/confetti';
import { formatAmount } from '@/lib/formatAmount';
import { type RewardTag, rewardBreakdown } from '@/lib/questReward';
import { type SoundKind, playSound } from '@/lib/sound';

const props = defineProps<{
  result: QuestCompletionResult | null;
  monster: { name: string; imageKey: string } | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const breakdown = computed(() =>
  props.result ? rewardBreakdown(props.result.gold, props.result.applied) : null,
);
const isCrit = computed(() => (breakdown.value?.crit ?? 1) > 1);
const isJackpot = computed(() => breakdown.value?.crit === 3);
const leveledUp = computed(() => (props.result?.ticketsGranted ?? 0) > 0);

// 소리는 하나만 튼다. 크리티컬 > 레벨업 > 일반 보상 순으로 고른다.
function rewardSound(): SoundKind {
  if (isJackpot.value) {
    return 'criticalX3';
  }
  if (isCrit.value) {
    return 'criticalX2';
  }
  if (leveledUp.value) {
    return 'levelUp';
  }
  return 'normalReward';
}

// 크리티컬이면 받은 금액을 0부터 올라가게 보여 준다.
const displayGold = ref(0);
let frame = 0;
const celebrated = ref(false);

function celebrate(gold: number): void {
  fireConfetti(isJackpot.value ? 'jackpot' : isCrit.value ? 'crit' : 'basic');
  playSound(rewardSound());
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!isCrit.value || reduceMotion) {
    displayGold.value = gold;
    return;
  }
  const startedAt = performance.now();
  const duration = isJackpot.value ? 1600 : 1200;
  const step = (now: number): void => {
    const progress = Math.min((now - startedAt) / duration, 1);
    displayGold.value = Math.round(gold * (1 - (1 - progress) ** 3));
    if (progress < 1) {
      frame = requestAnimationFrame(step);
    }
  };
  displayGold.value = 0;
  frame = requestAnimationFrame(step);
}

watch(
  () => props.result,
  (result) => {
    if (!result || celebrated.value) {
      return;
    }
    celebrated.value = true;
    celebrate(result.gold);
  },
  { immediate: true },
);

onUnmounted(() => {
  cancelAnimationFrame(frame);
  clearConfetti();
});

function tagLabel(tag: RewardTag): string {
  const value = tag.multiplier;
  switch (tag.type) {
    case 'job':
      return t('quest.resultTagJob', { value });
    case 'combo':
      return t('quest.resultTagCombo', { value });
    case 'note':
      return t('quest.resultTagNote', { value });
    case 'crit':
      return value === 3 ? t('quest.resultTagJackpot') : t('quest.resultTagCrit', { value });
  }
}

function tagClass(tag: RewardTag): string {
  if (tag.type !== 'crit') {
    return 'bg-muted text-secondary-foreground';
  }
  return tag.multiplier === 3
    ? 'tag-pulse bg-jackpot text-white shadow-[0_4px_14px_-2px_var(--jackpot-glow)]'
    : 'tag-shine bg-gold text-white';
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="absolute inset-0"
      :class="isJackpot ? 'bg-overlay-strong' : 'bg-overlay'"
      :aria-label="t('quest.close')"
      @click="result && emit('close')"
    />

    <div
      v-if="isJackpot"
      class="result-glow pointer-events-none absolute top-1/2 left-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,var(--jackpot-glow)_0%,var(--jackpot-glow)_30%,transparent_70%)]"
    />

    <div
      role="dialog"
      aria-modal="true"
      class="result-pop bg-surface relative z-10 w-full max-w-[340px] rounded-[22px] px-6 pt-[26px] pb-[22px] shadow-xl"
    >
      <span
        v-if="isJackpot"
        class="result-ribbon bg-jackpot absolute -top-2.5 right-[18px] rounded-full px-3.5 py-1.5 text-xs font-black text-white"
      >
        {{ t('quest.resultJackpot') }}
      </span>

      <div class="mb-4 flex flex-col items-center gap-2">
        <MonsterImage v-if="monster" :image-key="monster.imageKey" size="large" />
        <div
          v-else
          class="quest-check bg-accent flex size-10 items-center justify-center rounded-full"
        >
          <Check class="text-accent-foreground size-5" :stroke-width="3" />
        </div>
        <h2 v-if="monster" class="text-base font-bold">{{ monster.name }}</h2>
        <h2 v-if="result" class="text-secondary-foreground text-[13px] font-semibold">
          {{ t('quest.resultTitle') }}
        </h2>
      </div>

      <p
        v-if="!result"
        class="text-muted-foreground mb-2 animate-pulse text-center text-[13px] font-semibold"
      >
        {{ t('quest.resultSettling') }}
      </p>

      <div v-else-if="breakdown" class="mb-1.5 text-center">
        <p class="text-muted-foreground mb-1 text-[11.5px]">
          {{ t('quest.resultGoldLabel') }}
        </p>
        <p
          class="text-4xl leading-tight font-bold tabular-nums"
          :class="isCrit ? 'text-gold' : 'text-foreground'"
        >
          {{ t('quest.resultGold', { gold: formatAmount(displayGold) }) }}
        </p>
        <p v-if="breakdown.showBaseGold" class="text-muted-foreground mt-0.5 text-[11.5px]">
          {{ t('quest.resultBaseGold', { gold: formatAmount(breakdown.baseGold) }) }}
        </p>
        <p class="text-secondary-foreground mt-0.5 text-[13px]">
          {{ t('quest.resultXp', { xp: formatAmount(result.xp) }) }}
        </p>
      </div>

      <p v-if="isCrit" class="text-muted-foreground mb-2.5 text-center text-[11px]">
        {{ t('quest.resultCritNote') }}
      </p>

      <div v-if="breakdown?.receipt" class="bg-muted mt-3 mb-2.5 rounded-xl px-3.5 py-3 text-xs">
        <div class="text-secondary-foreground mb-1.5 flex justify-between">
          <span>{{ t('quest.resultReceiptBase') }}</span>
          <span class="tabular-nums">
            {{ t('quest.resultGold', { gold: formatAmount(breakdown.receipt.baseGold) }) }}
          </span>
        </div>
        <div class="text-foreground flex justify-between font-bold">
          <span>
            {{
              t('quest.resultReceiptCheck', {
                marked: breakdown.receipt.markedDays,
                elapsed: breakdown.receipt.elapsedDays,
              })
            }}
          </span>
          <span class="tabular-nums">×{{ breakdown.receipt.ratio }}</span>
        </div>
        <p class="text-muted-foreground mt-1 text-[11px]">
          {{
            t('quest.resultReceiptReason', {
              marked: breakdown.receipt.markedDays,
              elapsed: breakdown.receipt.elapsedDays,
            })
          }}
        </p>
      </div>

      <div
        v-if="breakdown && breakdown.tags.length > 0"
        class="mt-3.5 mb-0.5 flex flex-wrap justify-center gap-1.5"
      >
        <span
          v-for="tag in breakdown.tags"
          :key="tag.type"
          class="rounded-full px-3 py-1.5 text-[11px] font-bold"
          :class="tagClass(tag)"
        >
          {{ tagLabel(tag) }}
        </span>
      </div>

      <div
        v-if="leveledUp"
        class="border-border mt-[18px] flex flex-col items-center gap-2.5 border-t pt-4"
      >
        <p class="text-[15px] font-bold">
          {{ t('quest.resultLevel', { level: result?.level ?? 0 }) }}
        </p>
        <p
          class="bg-accent text-accent-foreground flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold"
        >
          <Ticket class="size-[13px]" />
          {{ t('quest.resultTickets', { count: result?.ticketsGranted ?? 0 }) }}
        </p>
        <p
          v-for="mark in result?.titlesGranted ?? []"
          :key="mark"
          class="text-gold border-gold rounded-full border border-dashed px-4 py-1.5 text-[12.5px] font-bold"
        >
          {{ t('home.titleReached', { mark }) }}
        </p>
      </div>

      <div v-if="result" class="bg-muted mt-3 rounded-xl px-3.5 py-3">
        <p class="mb-1.5 text-[12px] font-bold">{{ t('quest.battleLog') }}</p>
        <p class="text-secondary-foreground text-[13px] leading-normal whitespace-pre-line">
          {{ result.battleLog }}
        </p>
      </div>

      <Button v-if="result" type="button" class="mt-5 w-full rounded-full" @click="emit('close')">
        {{ t('quest.resultConfirm') }}
      </Button>
    </div>
  </div>
</template>
