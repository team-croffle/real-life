<script setup lang="ts">
import {
  Backpack,
  BarChart3,
  Briefcase,
  ChevronDown,
  Home,
  ListChecks,
  Megaphone,
  Settings,
  Shield,
  Sparkles,
  Star,
  Store,
  Swords,
  Wallet,
} from '@lucide/vue';
import { storeToRefs } from 'pinia';
import { type Component, computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import BossResultDialog from '@/components/boss/BossResultDialog.vue';
import DueTodayAlerts from '@/components/layouts/DueTodayAlerts.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import SettingsDialog from '@/components/settings/SettingsDialog.vue';
import { Button } from '@/components/ui/button';
import {
  refreshCurrentRewardEvent,
  resetCurrentRewardEvent,
  useCurrentRewardEvent,
} from '@/composables/useCurrentRewardEvent';
import { refreshDueTodayAlerts, resetDueTodayAlerts } from '@/composables/useDueTodayAlerts';
import { formatAppDateTime } from '@/lib/appDateTime';
import { formatEventMultiplier } from '@/lib/rewardEvents';
import { resetUnseenBosses } from '@/lib/unseenBosses';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth';

interface NavItem {
  to: string;
  label: string;
  icon: Component;
  exact: boolean;
}

interface UpcomingNavItem {
  label: string;
  icon: Component;
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'nav.home', icon: Home, exact: true },
  { to: '/quests', label: 'nav.quests', icon: ListChecks, exact: false },
  { to: '/bosses', label: 'nav.bosses', icon: Swords, exact: false },
  { to: '/stats', label: 'nav.stats', icon: BarChart3, exact: false },
  { to: '/shop', label: 'nav.shop', icon: Store, exact: false },
];

const upcomingNav: UpcomingNavItem[] = [
  { label: 'nav.inventory', icon: Backpack },
  { label: 'nav.gacha', icon: Sparkles },
];

const accountNav: NavItem[] = [
  { to: '/wallet', label: 'nav.wallet', icon: Wallet, exact: false },
  { to: '/job', label: 'nav.job', icon: Briefcase, exact: false },
];

const tabNav: NavItem[] = [...primaryNav, ...accountNav];

const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const { user, pending } = storeToRefs(auth);
const settingsOpen = ref(false);
const eventTipOpen = ref(false);
const { current: rewardEvent } = useCurrentRewardEvent();
const isAdmin = computed(() => user.value?.role === 'admin');
const eventMultText = computed(() =>
  rewardEvent.value ? formatEventMultiplier(rewardEvent.value.multiplier) : '',
);

function isCurrent(item: NavItem): boolean {
  if (item.exact) {
    return route.path === item.to;
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

onMounted(() => {
  void refreshDueTodayAlerts();
  void refreshCurrentRewardEvent();
});

async function onLogout(): Promise<void> {
  resetUnseenBosses();
  resetDueTodayAlerts();
  resetCurrentRewardEvent();
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen">
    <aside class="border-border hidden w-[260px] shrink-0 flex-col border-r px-[18px] py-6 md:flex">
      <RouterLink
        to="/"
        class="text-primary px-2 text-[22px] font-bold"
        :class="rewardEvent ? 'mb-3.5' : 'mb-7'"
      >
        {{ t('app.title') }}
      </RouterLink>

      <div v-if="rewardEvent" class="mx-0.5 mb-5">
        <button
          type="button"
          class="bg-gold flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-bold text-white"
          @click="eventTipOpen = !eventTipOpen"
        >
          <Star class="size-4 shrink-0" />
          <span class="min-w-0 flex-1">{{ t('event.chip', { n: eventMultText }) }}</span>
          <ChevronDown
            class="size-3 shrink-0 transition-transform"
            :class="eventTipOpen ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="eventTipOpen" class="bg-gold-soft mt-1.5 rounded-[10px] px-3 py-2.5">
          <p class="text-gold text-xs font-bold tabular-nums">
            {{ t('event.until', { time: formatAppDateTime(rewardEvent.endsAt) }) }}
          </p>
          <p class="text-secondary-foreground mt-0.5 text-[11px] leading-normal">
            {{ t('event.hint', { n: eventMultText }) }}
          </p>
        </div>
      </div>

      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold"
          :class="
            isCurrent(item)
              ? 'bg-accent text-accent-foreground'
              : 'text-secondary-foreground hover:bg-muted'
          "
        >
          <component :is="item.icon" class="size-[18px]" />
          {{ t(item.label) }}
        </RouterLink>
        <div
          v-for="item in upcomingNav"
          :key="item.label"
          class="text-muted-foreground flex cursor-default items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold opacity-60"
          aria-disabled="true"
        >
          <component :is="item.icon" class="size-[18px] shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ t(item.label) }}</span>
          <span class="bg-muted shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold">
            {{ t('nav.comingSoon') }}
          </span>
        </div>
      </nav>

      <p class="text-muted-foreground px-3.5 pt-4 pb-1.5 text-[10px] font-bold">
        {{ t('nav.account') }}
      </p>
      <nav class="flex flex-col gap-1">
        <RouterLink
          v-for="item in accountNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold"
          :class="
            isCurrent(item)
              ? 'bg-accent text-accent-foreground'
              : 'text-secondary-foreground hover:bg-muted'
          "
        >
          <component :is="item.icon" class="size-[18px]" />
          {{ t(item.label) }}
        </RouterLink>
        <RouterLink
          to="/notices"
          class="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-bold"
          :class="
            route.path === '/notices'
              ? 'bg-accent text-accent-foreground'
              : 'text-secondary-foreground hover:bg-muted'
          "
        >
          <Megaphone class="size-[18px]" />
          {{ t('nav.notices') }}
        </RouterLink>
        <RouterLink
          v-if="isAdmin"
          to="/admin"
          class="border-border text-secondary-foreground mt-1 flex items-center gap-3 rounded-xl border border-dashed px-3.5 py-2.5 text-sm font-bold"
        >
          <Shield class="size-[18px]" />
          {{ t('nav.admin') }}
        </RouterLink>
      </nav>

      <div class="flex-1" />

      <div v-if="user" class="bg-muted mb-2 flex items-center gap-2.5 rounded-xl p-2">
        <p class="min-w-0 flex-1 truncate text-[12.5px] font-bold">
          {{ user.nickname }}#{{ user.tag }}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        class="mb-2 justify-start gap-2.5"
        @click="settingsOpen = true"
      >
        <Settings />
        {{ t('settings.open') }}
      </Button>
      <div class="mb-2">
        <LocaleSwitcher />
      </div>
      <Button type="button" variant="outline" size="sm" :disabled="pending" @click="onLogout">
        {{ t('auth.logout') }}
      </Button>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="border-border flex items-center justify-between border-b px-4 py-3 md:hidden">
        <RouterLink to="/" class="text-primary text-lg font-bold">{{ t('app.title') }}</RouterLink>
        <div class="flex items-center gap-2">
          <button
            v-if="rewardEvent"
            type="button"
            class="bg-gold rounded-full px-2.5 py-1 text-[11px] font-extrabold text-white"
            :title="t('event.until', { time: formatAppDateTime(rewardEvent.endsAt) })"
          >
            ×{{ eventMultText }}
          </button>
          <DueTodayAlerts class="md:hidden" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            :aria-label="t('settings.open')"
            @click="settingsOpen = true"
          >
            <Settings />
          </Button>
          <LocaleSwitcher />
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-3"
            :disabled="pending"
            @click="onLogout"
          >
            {{ t('auth.logout') }}
          </Button>
        </div>
      </header>

      <main class="relative mx-auto w-full max-w-[880px] flex-1 px-4 py-8 pb-24 md:px-11 md:pb-12">
        <div class="absolute top-8 right-4 z-30 hidden md:right-11 md:block">
          <DueTodayAlerts />
        </div>
        <slot />
      </main>
    </div>

    <nav
      class="border-border bg-background fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t md:hidden"
    >
      <RouterLink
        v-for="item in tabNav"
        :key="item.to"
        :to="item.to"
        class="flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-bold"
        :class="isCurrent(item) ? 'text-accent-foreground' : 'text-muted-foreground'"
      >
        <component :is="item.icon" class="size-[18px]" />
        {{ t(item.label) }}
      </RouterLink>
    </nav>

    <SettingsDialog v-if="settingsOpen" @close="settingsOpen = false" />
    <BossResultDialog />
  </div>
</template>
