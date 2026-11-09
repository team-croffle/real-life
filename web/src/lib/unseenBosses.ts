import type { UnseenBossResult } from '@nest-vue/shared';

import { getUnseenBosses } from '@/lib/bosses';

let loadStarted = false;
let loadPromise: Promise<void> | null = null;
let queue: UnseenBossResult[] = [];
let cursor = 0;

export function currentUnseenBoss(): UnseenBossResult | null {
  return queue[cursor] ?? null;
}

export async function ensureUnseenBossesLoaded(): Promise<void> {
  if (loadStarted) {
    await loadPromise;
    return;
  }
  loadStarted = true;
  loadPromise = (async () => {
    try {
      queue = await getUnseenBosses();
      cursor = 0;
    } catch {
      loadStarted = false;
      loadPromise = null;
    }
  })();
  await loadPromise;
}

export function advanceUnseenBoss(): void {
  cursor += 1;
}

export function resetUnseenBosses(): void {
  loadStarted = false;
  loadPromise = null;
  queue = [];
  cursor = 0;
}
