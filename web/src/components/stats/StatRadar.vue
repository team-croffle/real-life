<script setup lang="ts">
import type { Stats } from '@nest-vue/shared';
import { BookOpen, Heart, Sparkles } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  stats: Stats;
}>();

const { t } = useI18n();

const CENTER_X = 100;
const CENTER_Y = 90;
const RADIUS = 58;

function point(ratio: number, axis: 0 | 1 | 2): [number, number] {
  const distance = RADIUS * ratio;
  if (axis === 0) {
    return [CENTER_X, CENTER_Y - distance];
  }
  if (axis === 1) {
    return [CENTER_X + distance * 0.866, CENTER_Y + distance * 0.5];
  }
  return [CENTER_X - distance * 0.866, CENTER_Y + distance * 0.5];
}

function polygon(ratio: number): string {
  return ([0, 1, 2] as const)
    .map((axis) => {
      const [x, y] = point(ratio, axis);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

const outerPoints = polygon(1);
const innerPoints = polygon(0.5);
const [outerStamina, outerIntellect, outerSense] = ([0, 1, 2] as const).map((axis) =>
  point(1, axis),
);

const maxValue = computed(() =>
  Math.max(props.stats.stamina, props.stats.intellect, props.stats.sense),
);

function share(value: number): number {
  if (maxValue.value <= 0) {
    return 0;
  }
  return value / maxValue.value;
}

const dataPoints = computed(() => {
  const values = [props.stats.stamina, props.stats.intellect, props.stats.sense] as const;
  return values
    .map((value, index) => {
      const [x, y] = point(share(value), index as 0 | 1 | 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
});

const dots = computed(() => {
  const values = [
    { key: 'stamina', value: props.stats.stamina, fill: 'fill-primary' },
    { key: 'intellect', value: props.stats.intellect, fill: 'fill-intel' },
    { key: 'sense', value: props.stats.sense, fill: 'fill-emo' },
  ] as const;

  return values.map((item, index) => {
    const [x, y] = point(share(item.value), index as 0 | 1 | 2);
    return { key: item.key, x, y, fill: item.fill };
  });
});

const rows = computed(() => [
  {
    key: 'stamina',
    label: t('home.stamina'),
    value: props.stats.stamina,
    width: `${share(props.stats.stamina) * 100}%`,
    bar: 'bg-primary',
    iconClass: 'text-primary',
    icon: Heart,
  },
  {
    key: 'intellect',
    label: t('home.intellect'),
    value: props.stats.intellect,
    width: `${share(props.stats.intellect) * 100}%`,
    bar: 'bg-intel',
    iconClass: 'text-intel',
    icon: BookOpen,
  },
  {
    key: 'sense',
    label: t('home.sense'),
    value: props.stats.sense,
    width: `${share(props.stats.sense) * 100}%`,
    bar: 'bg-emo',
    iconClass: 'text-emo',
    icon: Sparkles,
  },
]);
</script>

<template>
  <div class="flex flex-wrap items-center gap-[18px]">
    <svg viewBox="0 0 200 150" class="h-[150px] w-[200px] shrink-0 overflow-visible">
      <polygon :points="outerPoints" fill="none" class="stroke-border" stroke-width="1" />
      <polygon :points="innerPoints" fill="none" class="stroke-border" stroke-width="1" />
      <line
        :x1="CENTER_X"
        :y1="CENTER_Y"
        :x2="outerStamina[0]"
        :y2="outerStamina[1]"
        class="stroke-border"
        stroke-width="1"
      />
      <line
        :x1="CENTER_X"
        :y1="CENTER_Y"
        :x2="outerIntellect[0]"
        :y2="outerIntellect[1]"
        class="stroke-border"
        stroke-width="1"
      />
      <line
        :x1="CENTER_X"
        :y1="CENTER_Y"
        :x2="outerSense[0]"
        :y2="outerSense[1]"
        class="stroke-border"
        stroke-width="1"
      />
      <polygon :points="dataPoints" class="fill-accent" />
      <circle v-for="dot in dots" :key="dot.key" :cx="dot.x" :cy="dot.y" r="4" :class="dot.fill" />
      <text
        x="100"
        y="14"
        text-anchor="middle"
        class="fill-secondary-foreground text-[11px] font-bold"
      >
        {{ t('home.stamina') }} {{ stats.stamina }}
      </text>
      <text
        x="169"
        y="127"
        text-anchor="start"
        class="fill-secondary-foreground text-[11px] font-bold"
      >
        {{ t('home.intellect') }} {{ stats.intellect }}
      </text>
      <text
        x="31"
        y="127"
        text-anchor="end"
        class="fill-secondary-foreground text-[11px] font-bold"
      >
        {{ t('home.sense') }} {{ stats.sense }}
      </text>
    </svg>

    <div class="flex min-w-[160px] flex-1 flex-col gap-4">
      <div v-for="row in rows" :key="row.key">
        <div class="mb-1.5 flex items-center gap-2">
          <component :is="row.icon" class="size-4 shrink-0" :class="row.iconClass" />
          <span class="flex-1 text-[12.5px] font-bold">{{ row.label }}</span>
          <span class="text-secondary-foreground text-[12.5px]">{{ row.value }}</span>
        </div>
        <div class="bg-muted h-2 overflow-hidden rounded-full">
          <div class="h-full rounded-full" :class="row.bar" :style="{ width: row.width }" />
        </div>
      </div>
    </div>
  </div>
</template>
