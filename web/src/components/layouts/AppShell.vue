<script setup lang="ts">
import { BarChart3, Briefcase, Home, ListChecks, Wallet } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import type { Component } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink, useRoute } from 'vue-router';

import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import { Button } from '@/components/ui/button';
import { router } from '@/router';
import { useAuthStore } from '@/stores/auth';

interface NavItem {
  to: string;
  label: string;
  icon: Component;
  exact: boolean;
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'nav.home', icon: Home, exact: true },
  { to: '/quests', label: 'nav.quests', icon: ListChecks, exact: false },
  { to: '/stats', label: 'nav.stats', icon: BarChart3, exact: false },
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

function isCurrent(item: NavItem): boolean {
  if (item.exact) {
    return route.path === item.to;
  }
  return route.path === item.to || route.path.startsWith(`${item.to}/`);
}

async function onLogout(): Promise<void> {
  await auth.logout();
  await router.push('/login');
}
</script>

<template>
  <div class="bg-background text-foreground flex min-h-screen">
    <aside class="border-border hidden w-[260px] shrink-0 flex-col border-r px-[18px] py-6 md:flex">
      <RouterLink to="/" class="text-primary mb-7 px-2 text-[22px] font-bold">
        {{ t('app.title') }}
      </RouterLink>

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
      </nav>

      <div class="flex-1" />

      <div v-if="user" class="bg-muted mb-2 flex items-center gap-2.5 rounded-xl p-2">
        <p class="min-w-0 flex-1 truncate text-[12.5px] font-bold">
          {{ user.nickname }}#{{ user.tag }}
        </p>
      </div>

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

      <main class="mx-auto w-full max-w-[880px] flex-1 px-4 py-8 pb-24 md:px-11 md:pb-12">
        <slot />
      </main>
    </div>

    <nav
      class="border-border bg-background fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t md:hidden"
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
  </div>
</template>
