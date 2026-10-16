import type { QuestCompletionResult } from '@nest-vue/shared';
import { computed, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { ApiError } from '@/composables/useApi';
import { completeQuest, getQuests, markQuestToday, type QuestListItem } from '@/lib/quests';

type QuestView = 'loading' | 'ready' | 'error';

export function isQuestDone(item: QuestListItem): boolean {
  return item.schedule === 'deadline' ? item.completed : item.completedToday;
}

export function useQuestBoard() {
  const { t } = useI18n();

  const items = ref<QuestListItem[]>([]);
  const view = ref<QuestView>('loading');
  const completeId = ref<string | null>(null);
  const completeError = ref('');
  const completePending = ref(false);
  const completionResult = ref<QuestCompletionResult | null>(null);
  const busyId = ref<string | null>(null);
  const toast = ref('');

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let loadGeneration = 0;

  const completeItem = computed(
    () => items.value.find((item) => item.id === completeId.value) ?? null,
  );

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

  async function load(silent = false): Promise<void> {
    const generation = ++loadGeneration;
    if (!silent) {
      view.value = 'loading';
    }
    try {
      const next = await getQuests();
      if (generation !== loadGeneration) {
        return;
      }
      items.value = next;
      view.value = 'ready';
    } catch {
      if (generation !== loadGeneration) {
        return;
      }
      view.value = 'error';
    }
  }

  function openComplete(id: string): void {
    completeError.value = '';
    completeId.value = id;
  }

  function dismissCompletionResult(): void {
    completionResult.value = null;
  }

  async function onConfirmComplete(note: string): Promise<boolean> {
    const id = completeId.value;
    if (!id || completePending.value) {
      return false;
    }
    completePending.value = true;
    completeError.value = '';
    try {
      const result = await completeQuest(id, note);
      completeId.value = null;
      await load(true);
      if (result.ticketsGranted > 0 || result.titlesGranted.length > 0) {
        completionResult.value = result;
      } else {
        showToast(t('quest.toast.completed', { gold: result.gold, xp: result.xp }));
      }
      return true;
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
      return false;
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

  onUnmounted(() => {
    clearTimeout(toastTimer);
  });

  return {
    items,
    view,
    completeId,
    completeItem,
    completeError,
    completePending,
    completionResult,
    busyId,
    toast,
    load,
    openComplete,
    dismissCompletionResult,
    onConfirmComplete,
    onMark,
    showToast,
  };
}
