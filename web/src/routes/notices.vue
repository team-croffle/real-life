<script setup lang="ts">
import { ChevronRight, TriangleAlert } from '@lucide/vue';
import type { Announcement } from '@nest-vue/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import NoticeDialog from '@/components/notice/NoticeDialog.vue';
import { Button } from '@/components/ui/button';
import { listAnnouncements } from '@/lib/announcements';
import { formatAppDate } from '@/lib/appDateTime';

const { t } = useI18n();
const items = ref<Announcement[]>([]);
const view = ref<'loading' | 'ready' | 'error'>('loading');
const open = ref<Announcement | null>(null);

async function load(): Promise<void> {
  view.value = 'loading';
  try {
    items.value = await listAnnouncements();
    view.value = 'ready';
  } catch {
    view.value = 'error';
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <AppShell>
    <h1 class="mb-5 text-2xl font-bold">{{ t('notice.title') }}</h1>

    <div v-if="view === 'loading'" class="flex max-w-[760px] flex-col gap-2.5">
      <div
        v-for="index in 2"
        :key="index"
        class="bg-surface border-border h-[72px] animate-pulse rounded-2xl border"
      />
    </div>
    <div
      v-else-if="view === 'error'"
      class="flex flex-col items-center gap-3 px-5 py-12 text-center"
    >
      <TriangleAlert class="text-destructive size-[34px]" />
      <p class="text-secondary-foreground text-sm font-semibold">{{ t('notice.loadError') }}</p>
      <Button type="button" variant="outline" size="sm" class="w-auto" @click="load">
        {{ t('notice.retry') }}
      </Button>
    </div>
    <div v-else class="flex max-w-[760px] flex-col gap-2.5">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="bg-surface border-border flex items-center gap-3.5 rounded-2xl border px-[18px] py-4 text-left"
        @click="open = item"
      >
        <div class="min-w-0 flex-1">
          <p class="mb-1 truncate text-sm font-bold">{{ item.title }}</p>
          <p class="text-muted-foreground text-[11.5px] tabular-nums">
            {{ formatAppDate(item.createdAt) }}
          </p>
        </div>
        <ChevronRight class="text-muted-foreground size-4 shrink-0" />
      </button>
      <p
        v-if="items.length === 0"
        class="border-border text-muted-foreground rounded-2xl border border-dashed px-[18px] py-10 text-center text-[13px]"
      >
        {{ t('notice.empty') }}
      </p>
    </div>

    <NoticeDialog v-if="open" :notice="open" @close="open = null" />
  </AppShell>
</template>
