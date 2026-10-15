<script setup lang="ts">
import type { Stats } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  stats: Stats | null;
  balance: number | null;
}>();

const { t } = useI18n();

const rows = computed(() => {
  const stats = props.stats;
  const max = stats ? Math.max(stats.stamina, stats.intellect, stats.sense) : 0;
  const width = (value: number): string => (max <= 0 ? '0%' : `${(value / max) * 100}%`);

  return [
    {
      key: 'stamina',
      label: t('home.stamina'),
      value: stats?.stamina ?? null,
      bar: 'bg-primary',
      width: width(stats?.stamina ?? 0),
    },
    {
      key: 'intellect',
      label: t('home.intellect'),
      value: stats?.intellect ?? null,
      bar: 'bg-intel',
      width: width(stats?.intellect ?? 0),
    },
    {
      key: 'sense',
      label: t('home.sense'),
      value: stats?.sense ?? null,
      bar: 'bg-emo',
      width: width(stats?.sense ?? 0),
    },
  ];
});

function shown(value: number | null): string {
  return value === null ? t('home.emptyValue') : String(value);
}
</script>

<template>
  <section class="bg-surface border-border flex flex-col gap-4 rounded-[18px] border p-4">
    <p class="text-[22px] font-bold tracking-tight">
      {{ t('home.streak', { count: t('home.emptyValue') }) }}
    </p>

    <div class="flex flex-col gap-3">
      <div v-for="row in rows" :key="row.key">
        <div class="flex items-center justify-between text-[12px] font-bold">
          <span>{{ row.label }}</span>
          <span>{{ shown(row.value) }}</span>
        </div>
        <div class="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
          <div class="h-full rounded-full" :class="row.bar" :style="{ width: row.width }" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <p class="text-muted-foreground text-[11px] font-bold">{{ t('home.gold') }}</p>
        <p class="mt-0.5 text-lg font-bold">{{ shown(balance) }}</p>
      </div>
      <div>
        <p class="text-muted-foreground text-[11px] font-bold">{{ t('home.tickets') }}</p>
        <p class="mt-0.5 text-lg font-bold">{{ t('home.emptyValue') }}</p>
      </div>
    </div>
  </section>
</template>
