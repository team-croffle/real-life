import type { CurrentRewardEvent } from '@nest-vue/shared';
import { computed, ref, type Ref } from 'vue';

import { getCurrentRewardEvent } from '@/lib/rewardEvents';

const current: Ref<CurrentRewardEvent | null> = ref(null);
let loadGeneration = 0;

export function resetCurrentRewardEvent(): void {
  loadGeneration += 1;
  current.value = null;
}

export async function refreshCurrentRewardEvent(): Promise<void> {
  const generation = ++loadGeneration;
  try {
    const next = await getCurrentRewardEvent();
    if (generation !== loadGeneration) {
      return;
    }
    current.value = next;
  } catch {
    if (generation !== loadGeneration) {
      return;
    }
    current.value = null;
  }
}

export function useCurrentRewardEvent() {
  const multiplier = computed(() => current.value?.multiplier ?? null);
  const endsAt = computed(() => current.value?.endsAt ?? null);
  const active = computed(() => current.value !== null);

  return {
    current,
    multiplier,
    endsAt,
    active,
    refresh: refreshCurrentRewardEvent,
  };
}
