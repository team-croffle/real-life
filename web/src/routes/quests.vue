<script setup lang="ts">
import { ListChecks, Plus, TriangleAlert } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import QuestAbandonDialog from '@/components/quest/QuestAbandonDialog.vue';
import QuestCard from '@/components/quest/QuestCard.vue';
import QuestCompleteDialog from '@/components/quest/QuestCompleteDialog.vue';
import QuestRegisterDialog from '@/components/quest/QuestRegisterDialog.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import {
  abandonQuest,
  completeQuest,
  getQuests,
  markQuestToday,
  type QuestListItem,
} from '@/lib/quests';

type QuestTab = 'today' | 'done' | 'all';
type QuestView = 'loading' | 'ready' | 'error';

const tabs: QuestTab[] = ['today', 'done', 'all'];

const { t } = useI18n();

const items = ref<QuestListItem[]>([]);
const view = ref<QuestView>('loading');
const tab = ref<QuestTab>('today');
const menuId = ref<string | null>(null);
const abandonId = ref<string | null>(null);
const abandonError = ref('');
const abandonPending = ref(false);
const completeId = ref<string | null>(null);
const completeError = ref('');
const completePending = ref(false);
const registerOpen = ref(false);
const busyId = ref<string | null>(null);
const toast = ref('');

let toastTimer: ReturnType<typeof setTimeout> | undefined;

const filtered = computed(() => {
  if (tab.value === 'today') {
    return items.value.filter((item) => item.canComplete);
  }
  if (tab.value === 'done') {
    return items.value.filter((item) => item.dueToday && isDone(item));
  }
  return items.value;
});

const abandonTitle = computed(
  () => items.value.find((item) => item.id === abandonId.value)?.title ?? '',
);
const completeItem = computed(
  () => items.value.find((item) => item.id === completeId.value) ?? null,
);

function isDone(item: QuestListItem): boolean {
  return item.schedule === 'deadline' ? item.completed : item.completedToday;
}

function showToast(message: string): void {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 2500);
}

function statusErrorMessage(cause: unknown, messages: Record<number, string>): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  return messages[cause.status] ?? (cause.message || t('quest.errors.generic'));
}

function questErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.status === 404) {
    return t('quest.errors.notFound');
  }
  if (cause.message.includes('cannot be abandoned')) {
    return t('quest.errors.completedDeadline');
  }
  return cause.message || t('quest.errors.generic');
}

async function load(silent = false): Promise<void> {
  if (!silent) {
    view.value = 'loading';
  }
  try {
    items.value = await getQuests();
    view.value = 'ready';
  } catch {
    view.value = 'error';
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
  if (completeId.value) {
    if (!completePending.value) {
      completeId.value = null;
    }
    return;
  }
  if (abandonId.value) {
    if (!abandonPending.value) {
      abandonId.value = null;
    }
    return;
  }
  registerOpen.value = false;
}

function openRegister(): void {
  menuId.value = null;
  registerOpen.value = true;
}

function toggleMenu(id: string): void {
  menuId.value = menuId.value === id ? null : id;
}

function openAbandon(id: string): void {
  menuId.value = null;
  abandonError.value = '';
  abandonId.value = id;
}

function openComplete(id: string): void {
  menuId.value = null;
  completeError.value = '';
  completeId.value = id;
}

async function onConfirmComplete(note: string): Promise<void> {
  const id = completeId.value;
  if (!id || completePending.value) {
    return;
  }
  completePending.value = true;
  completeError.value = '';
  try {
    const result = await completeQuest(id, note);
    completeId.value = null;
    await load(true);
    showToast(t('quest.toast.completed', { gold: result.gold, xp: result.xp }));
  } catch (cause) {
    const message = statusErrorMessage(cause, {
      400: t('quest.errors.completeBadRequest'),
      403: t('quest.errors.completeForbidden'),
      404: t('quest.errors.notFound'),
      409: t('quest.errors.completeConflict'),
    });
    if (message) {
      completeError.value = message;
    }
  } finally {
    completePending.value = false;
  }
}

async function onMark(id: string): Promise<void> {
  if (busyId.value) {
    return;
  }
  busyId.value = id;
  try {
    await markQuestToday(id);
    await load(true);
    showToast(t('quest.toast.marked'));
  } catch (cause) {
    const message = statusErrorMessage(cause, {
      400: t('quest.errors.markBadRequest'),
      403: t('quest.errors.markForbidden'),
      404: t('quest.errors.notFound'),
      409: t('quest.errors.markConflict'),
    });
    if (message) {
      showToast(message);
    }
  } finally {
    busyId.value = null;
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
    await abandonQuest(id);
    abandonId.value = null;
    await load(true);
    showToast(t('quest.toast.abandoned'));
  } catch (cause) {
    const message = questErrorMessage(cause);
    if (message) {
      abandonError.value = message;
    }
  } finally {
    abandonPending.value = false;
  }
}

async function onCreated(title: string): Promise<void> {
  await load(true);
  showToast(t('quest.toast.created', { title }));
}

onMounted(() => {
  void load();
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  clearTimeout(toastTimer);
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
  <AppShell>
    <div>
      <div class="mb-5 flex items-center justify-between gap-3">
        <h1 class="text-2xl font-bold">{{ t('nav.quests') }}</h1>
        <Button type="button" class="w-auto gap-2 px-5" @click="openRegister">
          <Plus class="size-4" />
          {{ t('quest.add') }}
        </Button>
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
        class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('quest.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="load(false)">
          {{ t('quest.retry') }}
        </Button>
      </div>

      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
      >
        <ListChecks class="text-muted-foreground size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">{{ t('quest.empty') }}</p>
      </div>

      <div v-else class="flex flex-col gap-2.5">
        <QuestCard
          v-for="item in filtered"
          :key="item.id"
          :item="item"
          :menu-open="menuId === item.id"
          :busy="busyId === item.id"
          @complete="openComplete(item.id)"
          @mark="onMark(item.id)"
          @toggle-menu="toggleMenu(item.id)"
          @abandon="openAbandon(item.id)"
        />
      </div>
    </div>

    <QuestRegisterDialog :open="registerOpen" @close="registerOpen = false" @created="onCreated" />

    <QuestCompleteDialog
      v-if="completeItem"
      :item="completeItem"
      :pending="completePending"
      :error="completeError"
      @cancel="completeId = null"
      @confirm="onConfirmComplete"
    />

    <QuestAbandonDialog
      v-if="abandonId"
      :title="abandonTitle"
      :pending="abandonPending"
      :error="abandonError"
      @cancel="abandonId = null"
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
