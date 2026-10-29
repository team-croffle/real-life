<script setup lang="ts">
import type { WalletEntry, WalletEntryKind } from '@nest-vue/shared';
import { TriangleAlert, Wallet } from 'lucide-vue-next';
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/composables/useApi';
import { getWallet, getWalletEntries } from '@/lib/wallet';

type SectionState = 'loading' | 'ready' | 'error';

const { t, locale } = useI18n();

const balance = ref<number | null>(null);
const balanceState = ref<SectionState>('loading');
const entries = ref<WalletEntry[]>([]);
const page = ref(1);
const totalPages = ref(0);
const entriesState = ref<SectionState>('loading');

let balanceGeneration = 0;
let entriesGeneration = 0;
let leftWallet = false;

function formatCreatedAt(iso: string): string {
  return new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function entryAmount(amount: number): string {
  const shown = amount > 0 ? `+${amount}` : String(amount);
  return t('wallet.entryAmount', { amount: shown });
}

/** 종류 이름표 색. 들어온 것은 녹색, 깎인 것은 빨간색, 나머지는 회색이다. */
const KIND_CLASSES: Record<WalletEntryKind, string> = {
  completion: 'bg-accent text-accent-foreground',
  penalty: 'bg-destructive/10 text-destructive',
  post_hoc_deduction: 'bg-muted text-secondary-foreground',
  employment: 'bg-muted text-muted-foreground',
};

function amountClass(amount: number): string {
  if (amount > 0) {
    return 'text-primary';
  }
  if (amount < 0) {
    return 'text-destructive';
  }
  return 'text-secondary-foreground';
}

async function loadBalance(): Promise<void> {
  const generation = ++balanceGeneration;
  balanceState.value = 'loading';
  try {
    const next = await getWallet();
    if (generation !== balanceGeneration || leftWallet) {
      return;
    }
    balance.value = next.balance;
    balanceState.value = 'ready';
  } catch (cause) {
    if (generation !== balanceGeneration || leftWallet) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    balanceState.value = 'error';
  }
}

async function loadEntries(nextPage: number): Promise<void> {
  const generation = ++entriesGeneration;
  entriesState.value = 'loading';
  try {
    const next = await getWalletEntries(nextPage);
    if (generation !== entriesGeneration || leftWallet) {
      return;
    }
    entries.value = next.items;
    page.value = next.page;
    totalPages.value = next.totalPages;
    entriesState.value = 'ready';
  } catch (cause) {
    if (generation !== entriesGeneration || leftWallet) {
      return;
    }
    if (cause instanceof ApiError && cause.status === 401) {
      return;
    }
    entriesState.value = 'error';
  }
}

onMounted(() => {
  void loadBalance();
  void loadEntries(1);
});

onUnmounted(() => {
  leftWallet = true;
});
</script>

<template>
  <AppShell>
    <div>
      <h1 class="mb-5 text-2xl font-bold">{{ t('nav.wallet') }}</h1>

      <div
        v-if="balanceState === 'loading'"
        class="bg-surface border-border h-24 animate-pulse rounded-[18px] border"
      />
      <div
        v-else-if="balanceState === 'error'"
        class="bg-surface border-border flex flex-col items-center gap-3 rounded-[18px] border px-5 py-10 text-center"
      >
        <TriangleAlert class="text-destructive size-[34px]" />
        <p class="text-secondary-foreground text-sm font-semibold">
          {{ t('wallet.loadError') }}
        </p>
        <Button type="button" variant="outline" size="sm" class="w-auto px-4" @click="loadBalance">
          {{ t('wallet.retry') }}
        </Button>
      </div>
      <div v-else class="bg-surface border-border rounded-[18px] border px-5 py-5">
        <p class="text-secondary-foreground text-[12.5px] font-bold">
          {{ t('wallet.goldLabel') }}
        </p>
        <p class="mt-1 text-[26px] font-bold tracking-tight">
          {{ t('wallet.goldAmount', { amount: balance }) }}
        </p>
      </div>

      <section class="mt-6">
        <h2 class="mb-3 text-sm font-bold">{{ t('wallet.entriesTitle') }}</h2>

        <div v-if="entriesState === 'loading'" class="flex flex-col gap-2.5">
          <div
            v-for="index in 3"
            :key="index"
            class="bg-surface border-border h-12 animate-pulse rounded-[14px] border"
          />
        </div>
        <div
          v-else-if="entriesState === 'error'"
          class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
        >
          <TriangleAlert class="text-destructive size-[34px]" />
          <p class="text-secondary-foreground text-sm font-semibold">
            {{ t('wallet.loadError') }}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-4"
            @click="loadEntries(page)"
          >
            {{ t('wallet.retry') }}
          </Button>
        </div>
        <div
          v-else-if="entries.length === 0"
          class="flex flex-col items-center gap-3 px-5 py-[72px] text-center"
        >
          <Wallet class="text-muted-foreground size-[34px]" />
          <p class="text-secondary-foreground text-sm font-semibold">
            {{ t('wallet.entriesEmpty') }}
          </p>
        </div>
        <div v-else class="bg-surface border-border rounded-[18px] border px-[18px] py-2">
          <div
            v-for="(entry, index) in entries"
            :key="entry.id"
            class="flex items-center justify-between gap-3 py-3"
            :class="index < entries.length - 1 ? 'border-border border-b' : ''"
          >
            <div class="flex min-w-0 flex-col items-start gap-1">
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-bold"
                :class="KIND_CLASSES[entry.kind]"
              >
                {{ t(`wallet.kinds.${entry.kind}`) }}
              </span>
              <p class="text-muted-foreground text-[11px]">
                {{ formatCreatedAt(entry.createdAt) }}
              </p>
            </div>
            <p class="text-[13px] font-bold" :class="amountClass(entry.amount)">
              {{ entryAmount(entry.amount) }}
            </p>
          </div>
        </div>

        <div v-if="entriesState === 'ready' && totalPages > 1" class="mt-3 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-4"
            :disabled="page <= 1"
            @click="loadEntries(page - 1)"
          >
            {{ t('wallet.prev') }}
          </Button>
          <p class="text-secondary-foreground text-[12px] font-bold">
            {{ t('wallet.page', { page, totalPages }) }}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto px-4"
            :disabled="page >= totalPages"
            @click="loadEntries(page + 1)"
          >
            {{ t('wallet.next') }}
          </Button>
        </div>
      </section>

      <section v-if="balanceState === 'ready' && balance !== null" class="mt-6">
        <h2 class="mb-3 text-sm font-bold">{{ t('wallet.debtTitle') }}</h2>
        <div class="bg-surface border-border rounded-[18px] border px-5 py-5">
          <div v-if="balance < 0" class="flex items-center justify-between gap-3">
            <p class="text-secondary-foreground text-[13px]">
              {{ t('wallet.debtLabel') }}
            </p>
            <p class="text-destructive text-[17px] font-bold">
              {{ t('wallet.goldAmount', { amount: balance }) }}
            </p>
          </div>
          <p v-else class="text-secondary-foreground text-sm font-semibold">
            {{ t('wallet.debtNone') }}
          </p>
        </div>
      </section>
    </div>
  </AppShell>
</template>
