<script setup lang="ts">
import type { BossRoutineSubquest, BossSubquest, BossSummary, PastBoss } from '@nest-vue/shared';
import { bossFailPenalty, bossShortfall } from '@nest-vue/shared';
import { Ellipsis, TriangleAlert } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AppShell from '@/components/layouts/AppShell.vue';
import MonsterImage from '@/components/quest/MonsterImage.vue';
import QuestCard from '@/components/quest/QuestCard.vue';
import QuestCompleteDialog from '@/components/quest/QuestCompleteDialog.vue';
import QuestCompleteResultDialog from '@/components/quest/QuestCompleteResultDialog.vue';
import QuestHistoryPager from '@/components/quest/QuestHistoryPager.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { useQuestBoard } from '@/composables/useQuestBoard';
import { abandonBoss, getBosses, getBossHistory, retryBossMonster } from '@/lib/bosses';
import { calendarDaysBetween, seoulToday } from '@/lib/seoulDate';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const {
  items,
  completeId,
  completeItem,
  completeNote,
  completeError,
  completePending,
  resultOpen,
  completionResult,
  completionMonster,
  busyId,
  toast,
  load,
  openComplete,
  dismissCompletionResult,
  onConfirmComplete,
  onMark,
  showToast,
} = useQuestBoard();

const bosses = ref<BossSummary[]>([]);
const view = ref<'loading' | 'ready' | 'error'>('loading');
const showingHistory = ref(false);
const selectedId = ref<string | null>(null);
const menuOpen = ref(false);
const abandonOpen = ref(false);
const abandonPending = ref(false);
const abandonError = ref('');
const retrying = ref(false);
const expanded = ref(false);
const historyPage = ref(1);
const historySize = ref(20);
const historyItems = ref<PastBoss[]>([]);
const historyTotalPages = ref(0);
const historyView = ref<'loading' | 'ready' | 'error'>('loading');

let bossesGeneration = 0;
let historyGeneration = 0;

const selected = computed(
  () => bosses.value.find((boss) => boss.id === selectedId.value) ?? bosses.value[0] ?? null,
);

const todayQuests = computed(() =>
  items.value.filter((item) => item.bossId === selected.value?.id && item.canComplete),
);

const hpPercent = computed(() => {
  const boss = selected.value;
  if (!boss || boss.maxHp < 1) {
    return 0;
  }
  return Math.round((boss.hp / boss.maxHp) * 100);
});

const dDayLabel = computed(() => {
  const boss = selected.value;
  if (!boss) {
    return '';
  }
  const days = calendarDaysBetween(seoulToday(), boss.endsOn);
  return days <= 0 ? t('boss.dDay') : t('boss.dDayCount', { n: days });
});

const displayName = computed(() => {
  const boss = selected.value;
  if (!boss) {
    return '';
  }
  return boss.boss?.name ?? boss.title;
});

const abandonCost = computed(() => {
  const boss = selected.value;
  if (!boss) {
    return { gold: 0, xp: 0 };
  }
  return bossFailPenalty(bossShortfall(boss.maxHp, boss.hp));
});

const stats = computed(() => {
  const subquests = selected.value?.subquests ?? [];
  let done = 0;
  let remaining = 0;
  let missed = 0;
  for (const item of subquests) {
    if (item.kind === 'routine') {
      done += item.done;
      remaining += item.remaining;
      missed += item.missed;
    } else if (item.status === 'done') {
      done += 1;
    } else if (item.status === 'open') {
      remaining += 1;
    } else {
      missed += 1;
    }
  }
  return { done, remaining, missed };
});

const visibleSubquests = computed(() => {
  const subquests = selected.value?.subquests ?? [];
  if (expanded.value || subquests.length <= 5) {
    return subquests;
  }
  return subquests.slice(0, 5);
});

const hiddenSubquestCount = computed(() => {
  const total = selected.value?.subquests.length ?? 0;
  if (expanded.value || total <= 5) {
    return 0;
  }
  return total - 5;
});

async function loadBosses(silent = false): Promise<void> {
  const generation = ++bossesGeneration;
  if (!silent) {
    view.value = 'loading';
  }
  try {
    const next = await getBosses();
    if (generation !== bossesGeneration) {
      return;
    }
    bosses.value = next;
    const wanted = typeof route.query.id === 'string' ? route.query.id : selectedId.value;
    const match = next.find((boss) => boss.id === wanted);
    selectedId.value = match?.id ?? next[0]?.id ?? null;
    view.value = 'ready';
  } catch {
    if (generation !== bossesGeneration) {
      return;
    }
    view.value = 'error';
  }
}

async function loadHistory(silent = false): Promise<void> {
  const generation = ++historyGeneration;
  if (!silent) {
    historyView.value = 'loading';
  }
  try {
    const result = await getBossHistory(historyPage.value, historySize.value);
    if (generation !== historyGeneration) {
      return;
    }
    historyItems.value = result.items;
    historyTotalPages.value = result.totalPages;
    historyView.value = 'ready';
  } catch (cause) {
    if (generation !== historyGeneration) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 400 && historyPage.value !== 1) {
      historyPage.value = 1;
      await loadHistory(silent);
      return;
    }
    historyView.value = 'error';
  }
}

function selectBoss(id: string): void {
  showingHistory.value = false;
  selectedId.value = id;
  expanded.value = false;
  menuOpen.value = false;
  void router.replace({ path: '/bosses', query: { id } });
}

function openHistory(): void {
  showingHistory.value = true;
  menuOpen.value = false;
  void loadHistory(false);
}

function onHistoryPage(page: number): void {
  historyPage.value = page;
  void loadHistory(true);
}

function onHistorySize(size: number): void {
  historySize.value = size;
  historyPage.value = 1;
  void loadHistory(true);
}

async function refreshBoard(): Promise<void> {
  await Promise.all([load(true), loadBosses(true)]);
}

async function onRetryMonster(): Promise<void> {
  const boss = selected.value;
  if (!boss || retrying.value) {
    return;
  }
  retrying.value = true;
  try {
    await retryBossMonster(boss.id);
    await refreshBoard();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status !== 401 && cause.message) {
      showToast(cause.message);
    }
    await refreshBoard();
  } finally {
    retrying.value = false;
  }
}

async function onBossComplete(note: string): Promise<void> {
  const done = await onConfirmComplete(note);
  if (done) {
    await loadBosses(true);
  }
}

async function onBossMark(id: string): Promise<void> {
  await onMark(id);
  await loadBosses(true);
}

function openAbandon(): void {
  menuOpen.value = false;
  abandonError.value = '';
  abandonOpen.value = true;
}

function closeAbandon(): void {
  if (abandonPending.value) {
    return;
  }
  abandonOpen.value = false;
}

async function onConfirmAbandon(): Promise<void> {
  const boss = selected.value;
  if (!boss || abandonPending.value) {
    return;
  }
  abandonPending.value = true;
  abandonError.value = '';
  try {
    await abandonBoss(boss.id);
    abandonOpen.value = false;
    showToast(t('boss.toastAbandoned'));
    await refreshBoard();
  } catch (cause) {
    if (cause instanceof ApiError && cause.status !== 401) {
      abandonError.value = cause.message || t('quest.errors.generic');
    }
  } finally {
    abandonPending.value = false;
  }
}

function subquestChip(item: BossSubquest): string {
  if (item.kind === 'routine') {
    if (item.remaining > 0) {
      return t('boss.chipOpen');
    }
    if (item.missed === 0) {
      return t('boss.chipDone');
    }
    return t('boss.chipMissed');
  }
  if (item.status === 'open') {
    return t('boss.chipOpen');
  }
  if (item.status === 'done') {
    return t('boss.chipDone');
  }
  return t('boss.chipMissed');
}

function subquestReward(item: BossSubquest): string {
  return t('quest.rewardCard', { xp: item.expectedXp, gold: item.expectedGold });
}

function isRoutineSubquest(item: BossSubquest): item is BossRoutineSubquest {
  return item.kind === 'routine';
}

function pastResultLabel(result: PastBoss['result']): string {
  if (result === 'cleared') {
    return t('boss.resultCleared');
  }
  if (result === 'failed') {
    return t('boss.resultFailed');
  }
  return t('boss.resultAbandoned');
}

function pastResultClass(result: PastBoss['result']): string {
  if (result === 'cleared') {
    return 'bg-accent text-accent-foreground';
  }
  return 'bg-destructive/10 text-destructive';
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('[data-boss-menu]')) {
    return;
  }
  menuOpen.value = false;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }
  menuOpen.value = false;
  if (resultOpen.value) {
    if (completionResult.value) {
      dismissCompletionResult();
    }
    return;
  }
  if (completeId.value) {
    if (!completePending.value) {
      completeId.value = null;
    }
    return;
  }
  closeAbandon();
}

watch(
  () => route.query.id,
  (id) => {
    if (typeof id === 'string' && bosses.value.some((boss) => boss.id === id)) {
      showingHistory.value = false;
      selectedId.value = id;
      expanded.value = false;
    }
  },
);

watch(selectedId, () => {
  expanded.value = false;
});

onMounted(() => {
  if (route.query.created === '1') {
    showToast(t('boss.toastCreated'));
    const id = route.query.id;
    void router.replace({ path: '/bosses', query: typeof id === 'string' ? { id } : {} });
  }
  void load();
  void loadBosses();
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <AppShell>
    <div>
      <h1 class="mb-5 text-2xl font-bold">{{ t('nav.bosses') }}</h1>

      <div class="mb-5 flex flex-wrap items-center gap-2">
        <template v-if="bosses.length > 0">
          <button
            v-for="boss in bosses"
            :key="boss.id"
            type="button"
            class="rounded-full px-3 py-1.5 text-[12.5px] font-bold"
            :class="
              !showingHistory && selectedId === boss.id
                ? 'bg-accent text-accent-foreground'
                : 'bg-muted text-secondary-foreground'
            "
            @click="selectBoss(boss.id)"
          >
            {{ boss.boss?.name ?? boss.title }}
          </button>
        </template>
        <p
          v-else-if="view === 'ready'"
          class="text-secondary-foreground text-[12.5px] font-semibold"
        >
          {{ t('boss.emptyActive') }}
        </p>
        <button
          type="button"
          class="border-border text-secondary-foreground rounded-full border border-dashed px-3 py-1.5 text-[12.5px] font-bold"
          :class="showingHistory ? 'bg-muted' : ''"
          @click="openHistory"
        >
          {{ t('boss.historyChip') }}
        </button>
      </div>

      <div
        v-if="view === 'loading'"
        class="bg-surface border-border h-48 animate-pulse rounded-[18px] border"
      />
      <div
        v-else-if="view === 'error'"
        class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('boss.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadBosses()">
          {{ t('boss.retry') }}
        </Button>
      </div>

      <template v-else-if="showingHistory">
        <div v-if="historyView === 'loading'" class="flex flex-col gap-2.5">
          <div
            v-for="index in 3"
            :key="index"
            class="bg-surface border-border h-16 animate-pulse rounded-[14px] border"
          />
        </div>
        <div
          v-else-if="historyView === 'error'"
          class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
        >
          <TriangleAlert class="text-destructive size-[34px]" />
          <p class="text-secondary-foreground text-sm font-semibold">{{ t('boss.loadError') }}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-4"
            @click="loadHistory()"
          >
            {{ t('boss.retry') }}
          </Button>
        </div>
        <div
          v-else-if="historyItems.length === 0"
          class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
        >
          <p class="text-secondary-foreground text-sm font-semibold">
            {{ t('boss.historyEmpty') }}
          </p>
        </div>
        <div v-else class="flex flex-col gap-2.5">
          <article
            v-for="item in historyItems"
            :key="item.id"
            class="bg-surface border-border flex items-center gap-3 rounded-[14px] border px-3.5 py-3"
          >
            <MonsterImage
              v-if="item.boss"
              :image-key="item.boss.imageKey"
              size="thumb"
              variant="boss"
              :class="item.result === 'cleared' ? '' : 'opacity-40'"
            />
            <span
              v-else
              class="text-muted-foreground flex size-[18px] items-center justify-center text-[11px] font-bold"
              :class="item.result === 'cleared' ? '' : 'opacity-40'"
            >
              {{ t('boss.missingMark') }}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[13.5px] font-bold">{{ item.boss?.name ?? item.title }}</p>
              <p class="text-muted-foreground truncate text-[11.5px]">
                {{ t('boss.goalLine', { goal: item.title }) }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold"
              :class="pastResultClass(item.result)"
            >
              {{ pastResultLabel(item.result) }}
            </span>
            <span class="text-muted-foreground shrink-0 text-[11.5px]">{{ item.judgedOn }}</span>
          </article>
          <QuestHistoryPager
            v-if="historyTotalPages > 0"
            :page="historyPage"
            :total-pages="historyTotalPages"
            :size="historySize"
            @page="onHistoryPage"
            @size="onHistorySize"
          />
        </div>
      </template>

      <template v-else-if="selected">
        <article class="bg-surface border-border relative rounded-[18px] border px-5 py-5">
          <div class="absolute top-4 right-4" data-boss-menu>
            <button
              type="button"
              class="text-muted-foreground p-1"
              :aria-label="t('boss.menu')"
              :aria-expanded="menuOpen"
              @click="menuOpen = !menuOpen"
            >
              <Ellipsis class="size-[17px]" />
            </button>
            <div
              v-if="menuOpen"
              class="bg-surface border-border absolute top-9 right-0 z-10 w-[110px] overflow-hidden rounded-[10px] border shadow-lg"
            >
              <button
                type="button"
                class="text-destructive block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
                @click="openAbandon"
              >
                {{ t('boss.abandon') }}
              </button>
            </div>
          </div>

          <div class="flex flex-col items-center gap-3">
            <MonsterImage
              v-if="selected.boss"
              :image-key="selected.boss.imageKey"
              size="large"
              variant="boss"
            />
            <span
              v-else
              class="bg-muted text-muted-foreground flex size-24 items-center justify-center rounded-full text-2xl font-bold"
            >
              {{ t('boss.missingMark') }}
            </span>
            <h2 class="text-center text-[22px] font-bold">{{ displayName }}</h2>
            <p v-if="selected.boss" class="text-muted-foreground text-[12.5px]">
              {{ t('boss.goalLine', { goal: selected.title }) }}
            </p>
            <p v-if="selected.boss" class="text-secondary-foreground text-center text-[13px]">
              {{ selected.boss.description }}
            </p>
            <p
              v-else-if="selected.bossStatus === 'generating'"
              class="text-muted-foreground text-[12.5px]"
            >
              {{ t('boss.generating') }}
            </p>
            <div
              v-else-if="selected.bossStatus === 'failed'"
              class="flex flex-col items-center gap-2"
            >
              <p class="text-muted-foreground text-[12.5px]">{{ t('boss.generateFailed') }}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="w-auto"
                :disabled="retrying"
                @click="onRetryMonster"
              >
                {{ t('boss.retryMonster') }}
              </Button>
            </div>
            <p class="text-gold text-[13px] font-bold">{{ dDayLabel }}</p>
            <div class="w-full">
              <div class="bg-muted relative h-2.5 overflow-hidden rounded-full">
                <div class="bg-primary h-full rounded-full" :style="{ width: `${hpPercent}%` }" />
                <div class="bg-gold absolute top-0 h-full w-px" style="left: 20%" />
              </div>
              <p class="text-muted-foreground mt-2 text-center text-[11.5px]">
                {{ t('boss.hpLeft', { percent: hpPercent }) }}
              </p>
            </div>
          </div>
        </article>

        <section v-if="todayQuests.length > 0" class="mt-6">
          <h2 class="mb-3 text-sm font-bold">{{ t('boss.todayTitle') }}</h2>
          <div class="flex flex-col gap-2.5">
            <QuestCard
              v-for="item in todayQuests"
              :key="item.id"
              :item="item"
              :menu-open="false"
              :busy="busyId === item.id"
              @complete="openComplete(item.id)"
              @mark="onBossMark(item.id)"
            />
          </div>
        </section>

        <div class="mt-6 flex flex-wrap gap-2">
          <span class="bg-muted rounded-full px-3 py-1.5 text-[12px] font-bold">
            {{ t('boss.statDone', { n: stats.done }) }}
          </span>
          <span class="bg-muted rounded-full px-3 py-1.5 text-[12px] font-bold">
            {{ t('boss.statRemaining', { n: stats.remaining }) }}
          </span>
          <span class="bg-muted rounded-full px-3 py-1.5 text-[12px] font-bold">
            {{ t('boss.statMissed', { n: stats.missed }) }}
          </span>
        </div>

        <ul v-if="selected.subquests.length > 0" class="mt-4 flex flex-col gap-2">
          <li
            v-for="item in visibleSubquests"
            :key="item.id"
            class="bg-surface border-border flex flex-wrap items-center gap-2 rounded-[14px] border px-3.5 py-3"
          >
            <p class="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{{ item.title }}</p>
            <span
              v-if="isRoutineSubquest(item)"
              class="text-muted-foreground text-[11.5px] whitespace-nowrap"
            >
              {{
                t('boss.routineCounts', {
                  done: item.done,
                  missed: item.missed,
                  remaining: item.remaining,
                })
              }}
            </span>
            <span class="bg-muted rounded-full px-2 py-0.5 text-[10.5px] font-bold">
              {{ subquestChip(item) }}
            </span>
            <span class="text-muted-foreground text-[11.5px] whitespace-nowrap">
              {{ subquestReward(item) }}
            </span>
          </li>
        </ul>
        <button
          v-if="hiddenSubquestCount > 0"
          type="button"
          class="text-primary mt-2 text-[12.5px] font-bold"
          @click="expanded = true"
        >
          {{ t('boss.more', { n: hiddenSubquestCount }) }}
        </button>

        <section class="mt-6">
          <h2 class="mb-3 text-sm font-bold">{{ t('boss.logTitle') }}</h2>
          <p
            v-if="selected.latestLog?.kind === 'cut'"
            class="bg-surface border-border rounded-[14px] border px-3.5 py-3 text-[13px]"
          >
            {{
              t('boss.logCut', {
                questTitle: selected.latestLog.questTitle,
                amount: selected.latestLog.amount,
              })
            }}
          </p>
          <p
            v-else-if="selected.latestLog?.kind === 'counter'"
            class="bg-destructive/10 text-destructive rounded-[14px] px-3.5 py-3 text-[13px] font-semibold"
          >
            {{
              t('boss.logCounter', {
                questTitle: selected.latestLog.questTitle,
                gold: selected.latestLog.gold,
                xp: selected.latestLog.xp,
              })
            }}
          </p>
          <p v-else class="text-muted-foreground text-[13px]">{{ t('boss.logEmpty') }}</p>
        </section>
      </template>
    </div>

    <div
      v-if="abandonOpen && selected"
      class="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        class="bg-overlay absolute inset-0"
        :aria-label="t('boss.cancel')"
        @click="closeAbandon"
      />
      <div
        role="dialog"
        aria-modal="true"
        class="bg-surface relative z-10 w-full max-w-[340px] rounded-[18px] p-[22px] shadow-xl"
      >
        <h2 class="mb-2 text-[15px] font-bold">
          {{ t('boss.abandonTitle', { name: displayName }) }}
        </h2>
        <div class="bg-destructive/10 mb-[18px] rounded-xl px-3.5 py-3">
          <p class="text-destructive text-[15px] font-bold">
            {{ t('boss.abandonCost', { gold: abandonCost.gold, xp: abandonCost.xp }) }}
          </p>
          <p class="text-muted-foreground mt-1.5 text-[11px]">{{ t('boss.abandonNote') }}</p>
        </div>
        <p v-if="abandonError" class="text-destructive mb-3 text-[12px]">{{ abandonError }}</p>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto flex-1"
            :disabled="abandonPending"
            @click="closeAbandon"
          >
            {{ t('boss.cancel') }}
          </Button>
          <Button
            type="button"
            size="sm"
            class="bg-destructive hover:bg-destructive/90 w-auto flex-1"
            :disabled="abandonPending"
            @click="onConfirmAbandon"
          >
            {{ t('boss.abandon') }}
          </Button>
        </div>
      </div>
    </div>

    <QuestCompleteDialog
      v-if="completeItem"
      :item="completeItem"
      :note="completeNote"
      :pending="completePending"
      :error="completeError"
      @cancel="completeId = null"
      @confirm="onBossComplete"
    />

    <QuestCompleteResultDialog
      v-if="resultOpen"
      :result="completionResult"
      :monster="completionMonster"
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
