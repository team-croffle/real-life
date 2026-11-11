import type { QuestListItem } from '@nest-vue/shared';
import { computed, ref, type Ref } from 'vue';

import { getQuests } from '@/lib/quests';
import { seoulToday } from '@/lib/seoulDate';

const items: Ref<QuestListItem[]> = ref([]);
let loadGeneration = 0;

export function isDueTodayOpen(item: QuestListItem, today = seoulToday()): boolean {
  return item.endsOn === today && !item.completed;
}

export function resetDueTodayAlerts(): void {
  loadGeneration += 1;
  items.value = [];
}

export async function refreshDueTodayAlerts(): Promise<void> {
  const generation = ++loadGeneration;
  try {
    const next = await getQuests();
    if (generation !== loadGeneration) {
      return;
    }
    items.value = next.filter((item) => isDueTodayOpen(item));
  } catch {
    if (generation !== loadGeneration) {
      return;
    }
  }
}

export function useDueTodayAlerts() {
  const count = computed(() => items.value.length);

  return {
    items,
    count,
    refresh: refreshDueTodayAlerts,
    reset: resetDueTodayAlerts,
  };
}
