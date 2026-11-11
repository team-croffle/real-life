<script setup lang="ts">
import { Bell } from '@lucide/vue';
import type { QuestListItem } from '@nest-vue/shared';
import { nextTick, onMounted, onUnmounted, ref, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { useDueTodayAlerts } from '@/composables/useDueTodayAlerts';

const { t } = useI18n();
const router = useRouter();
const { items, count } = useDueTodayAlerts();

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const panelId = useId();
const titleId = useId();

function questLabel(item: QuestListItem): string {
  if (item.monsterStatus === 'ready' && item.monster?.name) {
    return item.monster.name;
  }
  return item.title;
}

function close(): void {
  open.value = false;
  detachPanelFollow();
}

function attachPanelFollow(): void {
  window.addEventListener('scroll', syncPanelPosition, true);
  window.addEventListener('resize', syncPanelPosition);
}

function detachPanelFollow(): void {
  window.removeEventListener('scroll', syncPanelPosition, true);
  window.removeEventListener('resize', syncPanelPosition);
}

function syncPanelPosition(): void {
  const anchor = root.value;
  const box = panel.value;
  if (!anchor || !box) {
    return;
  }
  const margin = 16;
  const gap = 8;
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(box.offsetWidth, window.innerWidth - margin * 2);
  let left = rect.right - width;
  left = Math.min(left, window.innerWidth - margin - width);
  left = Math.max(margin, left);
  box.style.top = `${rect.bottom + gap}px`;
  box.style.left = `${left}px`;
  box.style.width = `${width}px`;
}

async function toggle(): Promise<void> {
  if (open.value) {
    close();
    return;
  }
  open.value = true;
  await nextTick();
  if (!open.value) {
    return;
  }
  syncPanelPosition();
  attachPanelFollow();
}

async function onSelect(): Promise<void> {
  close();
  if (router.currentRoute.value.path !== '/') {
    await router.push('/');
  }
}

function onPointerDown(event: PointerEvent): void {
  if (!open.value) {
    return;
  }
  const target = event.target;
  if (target instanceof Node && root.value?.contains(target)) {
    return;
  }
  close();
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !open.value) {
    return;
  }
  event.stopImmediatePropagation();
  close();
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown, true);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown, true);
  detachPanelFollow();
});
</script>

<template>
  <div ref="root" class="relative">
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="relative"
      :aria-label="open ? t('alerts.close') : t('alerts.open')"
      :aria-expanded="open"
      aria-haspopup="dialog"
      :aria-controls="panelId"
      @click="toggle"
    >
      <Bell />
      <span
        v-if="count > 0"
        class="bg-destructive text-primary-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-bold"
      >
        {{ count }}
      </span>
    </Button>
    <div
      v-if="open"
      :id="panelId"
      ref="panel"
      role="dialog"
      :aria-labelledby="titleId"
      class="border-border bg-surface fixed z-30 max-h-[min(24rem,calc(100vh-5rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-[14px] border"
    >
      <p :id="titleId" class="text-foreground px-3.5 py-3 text-sm font-bold">
        {{ t('alerts.title') }}
      </p>
      <p
        v-if="items.length === 0"
        class="text-muted-foreground flex flex-col items-center gap-2 px-3.5 pt-2 pb-8 text-center text-[12.5px] font-semibold"
      >
        <Bell class="size-8" />
        {{ t('alerts.empty') }}
      </p>
      <ul v-else class="flex flex-col pb-2">
        <li v-for="item in items" :key="item.id">
          <button
            type="button"
            class="hover:bg-muted flex w-full items-center gap-2 px-3.5 py-2.5 text-left"
            @click="onSelect"
          >
            <span class="text-foreground min-w-0 flex-1 truncate text-[12.5px] font-bold">
              {{ questLabel(item) }}
            </span>
            <span
              class="bg-accent text-accent-foreground shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            >
              {{ t(`quest.categories.${item.category}`) }}
            </span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
