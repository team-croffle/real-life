<script setup lang="ts">
import { ListChecks, Plus, Sword, TriangleAlert } from '@lucide/vue';
import type { Routine } from '@nest-vue/shared';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BossRegisterDialog from '@/components/boss/BossRegisterDialog.vue';
import AppShell from '@/components/layouts/AppShell.vue';
import MonsterViewDialog from '@/components/quest/MonsterViewDialog.vue';
import type { MonsterViewTarget } from '@/components/quest/MonsterViewDialog.vue';
import QuestAbandonDialog from '@/components/quest/QuestAbandonDialog.vue';
import QuestCard from '@/components/quest/QuestCard.vue';
import QuestCompleteDialog from '@/components/quest/QuestCompleteDialog.vue';
import QuestCompleteResultDialog from '@/components/quest/QuestCompleteResultDialog.vue';
import QuestHistoryPager from '@/components/quest/QuestHistoryPager.vue';
import QuestRegisterDialog from '@/components/quest/QuestRegisterDialog.vue';
import QuestRestDialog from '@/components/quest/QuestRestDialog.vue';
import RoutineEditDialog from '@/components/quest/RoutineEditDialog.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { isQuestDone, useQuestBoard } from '@/composables/useQuestBoard';
import {
  abandonQuest,
  deleteRoutine,
  getQuestHistory,
  getRoutines,
  pauseRoutine,
  resumeRoutine,
  retryQuestMonster,
} from '@/lib/quests';
import type { QuestListItem } from '@/lib/quests';

type QuestTab = 'today' | 'done' | 'all' | 'routines';

const tabs: QuestTab[] = ['today', 'done', 'all', 'routines'];

const { t } = useI18n();
const {
  items,
  view,
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

const tab = ref<QuestTab>('today');
const historyPage = ref(1);
const historySize = ref(20);
const historyItems = ref<QuestListItem[]>([]);
const historyTotal = ref(0);
const historyTotalPages = ref(0);
const historyView = ref<'loading' | 'ready' | 'error'>('loading');
let historyGeneration = 0;
const monsterView = ref<MonsterViewTarget | null>(null);
const retryingId = ref<string | null>(null);
const routines = ref<Routine[]>([]);
const routinesView = ref<'loading' | 'ready' | 'error'>('loading');
const menuId = ref<string | null>(null);
const abandonId = ref<string | null>(null);
const abandonKind = ref<'quest' | 'routine'>('quest');
const abandonError = ref('');
const abandonPending = ref(false);
const restId = ref<string | null>(null);
const restError = ref('');
const restPending = ref(false);
const resumeId = ref<string | null>(null);
let routinesGeneration = 0;
const registerOpen = ref(false);
const registerBusy = ref(false);
const bossRegisterOpen = ref(false);
const bossRegisterBusy = ref(false);
const editRoutine = ref<Routine | null>(null);
const editBusy = ref(false);

const filtered = computed(() => {
  if (tab.value === 'today') {
    return items.value.filter((item) => item.canComplete);
  }
  if (tab.value === 'done') {
    return items.value.filter((item) => item.dueToday && isQuestDone(item));
  }
  return historyItems.value;
});

const listView = computed(() => {
  if (tab.value === 'routines') {
    return routinesView.value;
  }
  if (tab.value === 'all') {
    return historyView.value;
  }
  return view.value;
});

const shownCount = computed(() => {
  if (tab.value === 'routines') {
    return routines.value.length;
  }
  return filtered.value.length;
});

const abandonTitle = computed(() => {
  const source = abandonKind.value === 'routine' ? routines.value : items.value;
  return source.find((item) => item.id === abandonId.value)?.title ?? '';
});

const abandonCost = computed(() => {
  if (abandonKind.value !== 'quest') {
    return { gold: 0, xp: 0 };
  }
  const item = items.value.find((quest) => quest.id === abandonId.value);
  return { gold: item?.abandonGold ?? 0, xp: item?.abandonXp ?? 0 };
});

const restTitle = computed(
  () => routines.value.find((item) => item.id === restId.value)?.title ?? '',
);

function questErrorMessage(cause: unknown, action?: 'rest' | 'resume'): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.status === 404) {
    return t('quest.errors.notFound');
  }
  if (cause.status === 400 && action === 'rest') {
    return t('quest.errors.restBadRequest');
  }
  if (cause.status === 400 && action === 'resume') {
    return t('quest.errors.resumeBadRequest');
  }
  if (cause.message.includes('cannot be abandoned')) {
    return t('quest.errors.completedDeadline');
  }
  return cause.message || t('quest.errors.generic');
}

async function loadHistory(silent = false): Promise<void> {
  const generation = ++historyGeneration;
  if (!silent) {
    historyView.value = 'loading';
  }
  try {
    const result = await getQuestHistory(historyPage.value, historySize.value);
    if (generation !== historyGeneration) {
      return;
    }
    historyItems.value = result.items;
    historyTotal.value = result.total;
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

function onHistoryPage(page: number): void {
  historyPage.value = page;
  void loadHistory(true);
}

function onHistorySize(size: number): void {
  historySize.value = size;
  historyPage.value = 1;
  void loadHistory(true);
}

watch(tab, (value) => {
  if (value === 'all') {
    void loadHistory(false);
  }
});

async function onRetryMonster(id: string): Promise<void> {
  if (retryingId.value) {
    return;
  }
  retryingId.value = id;
  try {
    await retryQuestMonster(id);
    await Promise.all([load(true), tab.value === 'all' ? loadHistory(true) : Promise.resolve()]);
  } catch (cause) {
    const message = questErrorMessage(cause);
    if (message) {
      showToast(message);
    }
    await Promise.all([load(true), tab.value === 'all' ? loadHistory(true) : Promise.resolve()]);
  } finally {
    retryingId.value = null;
  }
}

function onPointerDown(event: PointerEvent): void {
  const target = event.target;
  if (!(target instanceof Element) || target.closest('[data-quest-menu]')) {
    return;
  }
  menuId.value = null;
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') {
    return;
  }
  menuId.value = null;
  if (monsterView.value) {
    monsterView.value = null;
    return;
  }
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
  if (abandonId.value) {
    closeAbandon();
    return;
  }
  if (restId.value) {
    closeRest();
    return;
  }
  if (editRoutine.value) {
    closeEdit();
    return;
  }
  if (bossRegisterBusy.value) {
    return;
  }
  if (bossRegisterOpen.value) {
    bossRegisterOpen.value = false;
    return;
  }
  if (registerBusy.value) {
    return;
  }
  registerOpen.value = false;
}

function openRegister(): void {
  menuId.value = null;
  registerOpen.value = true;
}

function closeEdit(): void {
  if (editBusy.value) {
    return;
  }
  editRoutine.value = null;
}

function openEdit(id: string): void {
  const routine = routines.value.find((item) => item.id === id);
  if (!routine || routine.bossId !== null || routine.monsterStatus === 'generating') {
    return;
  }
  menuId.value = null;
  editRoutine.value = routine;
}

async function onRoutineSaved(): Promise<void> {
  await Promise.all([load(true), loadRoutines(true)]);
  showToast(t('quest.toast.updated'));
}

function toggleMenu(id: string): void {
  menuId.value = menuId.value === id ? null : id;
}

function closeAbandon(): void {
  if (abandonPending.value) {
    return;
  }
  abandonId.value = null;
}

function openAbandon(id: string, kind: 'quest' | 'routine'): void {
  menuId.value = null;
  abandonError.value = '';
  abandonKind.value = kind;
  abandonId.value = id;
}

async function loadRoutines(silent = false): Promise<void> {
  const generation = ++routinesGeneration;
  if (!silent) {
    routinesView.value = 'loading';
  }
  try {
    const next = await getRoutines();
    if (generation !== routinesGeneration) {
      return;
    }
    routines.value = next;
    routinesView.value = 'ready';
  } catch {
    if (generation !== routinesGeneration) {
      return;
    }
    routinesView.value = 'error';
  }
}

function closeRest(): void {
  if (restPending.value) {
    return;
  }
  restId.value = null;
}

function openRest(id: string): void {
  menuId.value = null;
  restError.value = '';
  restId.value = id;
}

function requestComplete(id: string): void {
  menuId.value = null;
  openComplete(id);
}

async function onQuestComplete(note: string): Promise<boolean> {
  const completed = await onConfirmComplete(note);
  if (tab.value === 'all') {
    await loadHistory(true);
  }
  return completed;
}

async function onQuestMark(id: string): Promise<void> {
  await onMark(id);
  if (tab.value === 'all') {
    await loadHistory(true);
  }
}

async function onConfirmAbandon(): Promise<void> {
  const id = abandonId.value;
  if (!id || abandonPending.value) {
    return;
  }
  abandonPending.value = true;
  abandonError.value = '';
  try {
    if (abandonKind.value === 'routine') {
      await deleteRoutine(id);
    } else {
      await abandonQuest(id);
    }
    abandonId.value = null;
    await Promise.all([
      load(true),
      loadRoutines(true),
      tab.value === 'all' && abandonKind.value === 'quest' ? loadHistory(true) : Promise.resolve(),
    ]);
    showToast(t(abandonKind.value === 'routine' ? 'quest.toast.deleted' : 'quest.toast.abandoned'));
  } catch (cause) {
    const message = questErrorMessage(cause);
    if (message) {
      abandonError.value = message;
    }
  } finally {
    abandonPending.value = false;
  }
}

async function onConfirmRest(): Promise<void> {
  const id = restId.value;
  if (!id || restPending.value) {
    return;
  }
  restPending.value = true;
  restError.value = '';
  try {
    await pauseRoutine(id);
    restId.value = null;
    await Promise.all([load(true), loadRoutines(true)]);
    showToast(t('quest.toast.rested'));
  } catch (cause) {
    const message = questErrorMessage(cause, 'rest');
    if (message) {
      restError.value = message;
    }
  } finally {
    restPending.value = false;
  }
}

async function onResume(id: string): Promise<void> {
  if (resumeId.value || restPending.value || abandonPending.value) {
    return;
  }
  resumeId.value = id;
  try {
    await resumeRoutine(id);
    await Promise.all([load(true), loadRoutines(true)]);
    showToast(t('quest.toast.resumed'));
  } catch (cause) {
    const message = questErrorMessage(cause, 'resume');
    if (message) {
      showToast(message);
    }
  } finally {
    resumeId.value = null;
  }
}

async function onCreated(title: string): Promise<void> {
  await Promise.all([load(true), loadRoutines(true)]);
  showToast(t('quest.toast.created', { title }));
}

onMounted(() => {
  void load();
  void loadRoutines();
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
      <div class="mb-5 flex items-center justify-between gap-3 md:pr-12">
        <h1 class="text-2xl font-bold">{{ t('nav.quests') }}</h1>
        <div class="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            class="border-gold text-gold hover:bg-gold-soft w-auto gap-2 px-5"
            @click="bossRegisterOpen = true"
          >
            <Sword class="size-4" />
            {{ t('boss.create') }}
          </Button>
          <Button type="button" class="w-auto gap-2 px-5" @click="openRegister">
            <Plus class="size-4" />
            {{ t('quest.add') }}
          </Button>
        </div>
      </div>

      <div class="bg-muted mb-5 inline-flex gap-0.5 rounded-[10px] p-[3px]">
        <button
          v-for="value in tabs"
          :key="value"
          type="button"
          class="rounded-lg px-4 py-2 text-[12.5px] font-bold"
          :class="tab === value ? 'bg-surface text-foreground' : 'text-secondary-foreground'"
          @click="tab = value"
        >
          {{ t(`quest.tabs.${value}`) }}
        </button>
      </div>

      <div v-if="listView === 'loading'" class="flex flex-col gap-2.5">
        <div
          v-for="index in 3"
          :key="index"
          class="bg-surface border-border h-12 animate-pulse rounded-[14px] border"
          :style="{ animationDelay: `${(index - 1) * 0.12}s` }"
        />
      </div>

      <div
        v-else-if="listView === 'error'"
        class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('quest.loadError') }}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto px-4"
          @click="
            tab === 'routines'
              ? loadRoutines(false)
              : tab === 'all'
                ? loadHistory(false)
                : load(false)
          "
        >
          {{ t('quest.retry') }}
        </Button>
      </div>

      <div
        v-else-if="shownCount === 0"
        class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
      >
        <ListChecks class="text-muted-foreground size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">
          {{ tab === 'routines' ? t('quest.emptyRoutines') : t('quest.empty') }}
        </p>
      </div>

      <div v-else-if="tab === 'routines'" class="flex flex-col gap-2.5">
        <QuestCard
          v-for="item in routines"
          :key="item.id"
          :item="item"
          :menu-open="menuId === item.id"
          :busy="resumeId === item.id"
          @toggle-menu="toggleMenu(item.id)"
          @abandon="openAbandon(item.id, 'routine')"
          @rest="openRest(item.id)"
          @resume="onResume(item.id)"
          @edit="openEdit(item.id)"
        />
      </div>

      <div v-else class="flex flex-col gap-2.5">
        <QuestCard
          v-for="item in filtered"
          :key="item.id"
          :item="item"
          :menu-open="menuId === item.id"
          :busy="busyId === item.id || retryingId === item.id"
          @complete="requestComplete(item.id)"
          @mark="onQuestMark(item.id)"
          @toggle-menu="toggleMenu(item.id)"
          @abandon="openAbandon(item.id, 'quest')"
          @view-monster="monsterView = $event"
          @retry-monster="onRetryMonster(item.id)"
        />
        <QuestHistoryPager
          v-if="tab === 'all' && historyTotal > 0"
          :page="historyPage"
          :total-pages="historyTotalPages"
          :size="historySize"
          @page="onHistoryPage"
          @size="onHistorySize"
        />
      </div>
    </div>

    <RoutineEditDialog
      v-if="editRoutine"
      :routine="editRoutine"
      @close="closeEdit"
      @saved="onRoutineSaved"
      @busy="editBusy = $event"
    />

    <QuestRegisterDialog
      :open="registerOpen"
      @close="registerOpen = false"
      @created="onCreated"
      @busy="registerBusy = $event"
    />

    <BossRegisterDialog
      :open="bossRegisterOpen"
      @close="bossRegisterOpen = false"
      @created="bossRegisterOpen = false"
      @busy="bossRegisterBusy = $event"
    />

    <QuestCompleteDialog
      v-if="completeItem"
      :item="completeItem"
      :note="completeNote"
      :pending="completePending"
      :error="completeError"
      @cancel="completeId = null"
      @confirm="onQuestComplete"
    />

    <QuestCompleteResultDialog
      v-if="resultOpen"
      :result="completionResult"
      :monster="completionMonster"
      @close="dismissCompletionResult"
    />

    <MonsterViewDialog
      v-if="monsterView"
      :name="monsterView.name"
      :image-key="monsterView.imageKey"
      :description="monsterView.description"
      :title="monsterView.title"
      @close="monsterView = null"
    />

    <QuestRestDialog
      v-if="restId"
      :title="restTitle"
      :pending="restPending"
      :error="restError"
      @cancel="closeRest"
      @confirm="onConfirmRest"
    />

    <QuestAbandonDialog
      v-if="abandonId"
      :title="abandonTitle"
      :routine="abandonKind === 'routine'"
      :gold="abandonCost.gold"
      :xp="abandonCost.xp"
      :pending="abandonPending"
      :error="abandonError"
      @cancel="closeAbandon"
      @confirm="onConfirmAbandon"
    />

    <p
      v-if="toast"
      class="bg-foreground text-background fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold md:bottom-8"
    >
      {{ toast }}
    </p>
  </AppShell>
</template>
