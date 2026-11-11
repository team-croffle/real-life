<script setup lang="ts">
import { ChevronLeft, Megaphone, Medal, Shield, Users } from '@lucide/vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

import { getTheme, setTheme } from '@/lib/preferences';

export type AdminTab = 'accounts' | 'announcements' | 'events';

defineProps<{
  tab: AdminTab;
}>();

const emit = defineEmits<{
  'update:tab': [value: AdminTab];
}>();

const { t } = useI18n();
const theme = ref(getTheme());

const themeLabel = computed(() =>
  theme.value === 'dark' ? t('settings.themeDark') : t('settings.themeLight'),
);

function toggleTheme(): void {
  const next = theme.value === 'dark' ? 'light' : 'dark';
  theme.value = next;
  setTheme(next);
}

function navClass(active: boolean): string {
  return active
    ? 'bg-primary text-primary-foreground'
    : 'text-white/65 hover:bg-white/8 hover:text-white';
}
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen">
    <aside
      class="bg-admin-side flex w-[230px] shrink-0 flex-col gap-1 px-[18px] py-[26px] text-white"
    >
      <div class="mb-[22px] flex items-center gap-2 px-1.5">
        <span class="bg-primary flex size-[26px] items-center justify-center rounded-lg">
          <Shield class="size-3.5 text-white" />
        </span>
        <span class="text-[13.5px] font-bold">{{ t('admin.brand') }}</span>
      </div>

      <button
        type="button"
        class="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-bold"
        :class="navClass(tab === 'accounts')"
        @click="emit('update:tab', 'accounts')"
      >
        <Users class="size-[15px]" />
        {{ t('admin.nav.accounts') }}
      </button>
      <button
        type="button"
        class="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-bold"
        :class="navClass(tab === 'announcements')"
        @click="emit('update:tab', 'announcements')"
      >
        <Megaphone class="size-[15px]" />
        {{ t('admin.nav.announcements') }}
      </button>
      <button
        type="button"
        class="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left text-[13px] font-bold"
        :class="navClass(tab === 'events')"
        @click="emit('update:tab', 'events')"
      >
        <Medal class="size-[15px]" />
        {{ t('admin.nav.events') }}
      </button>

      <div class="flex-1" />

      <RouterLink
        to="/"
        class="mb-2 flex items-center gap-2 rounded-[10px] border border-white/14 px-3 py-2.5 text-left text-[12.5px] font-bold text-white/80"
      >
        <ChevronLeft class="size-3.5" />
        {{ t('admin.backToApp') }}
      </RouterLink>
      <button
        type="button"
        class="rounded-[10px] border border-white/14 px-3 py-2 text-left text-[11.5px] font-semibold text-white/60"
        @click="toggleTheme"
      >
        {{ themeLabel }}
      </button>
    </aside>

    <main class="min-w-0 flex-1 overflow-y-auto px-10 py-8">
      <slot />
    </main>
  </div>
</template>
