<script setup lang="ts">
import { Check, Ellipsis } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import type { QuestListItem } from '@/lib/quests';

const props = defineProps<{
  item: QuestListItem;
  menuOpen: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  mark: [];
  toggleMenu: [];
  abandon: [];
}>();

const { t } = useI18n();

const done = computed(() =>
  props.item.schedule === 'deadline' ? props.item.completed : props.item.completedToday,
);

const scheduleText = computed(() => {
  if (props.item.schedule === 'deadline') {
    return t('quest.repeat.deadline', { date: props.item.endsOn ?? '' });
  }

  const weekdays = props.item.weekdays ?? [];
  if (weekdays.length === 7 && !props.item.biweekly) {
    return t('quest.repeat.daily');
  }

  const days = weekdays.map((weekday) => t(`quest.weekdays.${weekday}`)).join('·');
  if (props.item.biweekly) {
    return t('quest.repeat.biweekly', { days });
  }
  return days;
});

const difficultyClass = computed(() => {
  if (props.item.difficulty === 'easy') {
    return 'text-primary';
  }
  if (props.item.difficulty === 'hard') {
    return 'text-destructive';
  }
  return 'text-intel';
});
</script>

<template>
  <article
    class="bg-surface border-border relative flex flex-wrap items-center gap-3 rounded-[14px] border px-3.5 py-3"
    :class="done ? 'opacity-[0.42]' : undefined"
  >
    <div
      v-if="done"
      class="quest-check bg-muted border-border flex size-5 shrink-0 items-center justify-center rounded-full border"
    >
      <Check class="text-muted-foreground size-2.5" :stroke-width="3.4" />
    </div>
    <button
      v-else-if="item.schedule !== 'deadline' && item.canComplete"
      type="button"
      class="border-primary size-5 shrink-0 rounded-full border-2 bg-transparent"
      :aria-label="t('quest.complete')"
      @click="emit('complete')"
    />
    <div v-else class="size-5 shrink-0" />

    <span
      class="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
      :class="done ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground'"
    >
      {{ t(`quest.categories.${item.category}`) }}
    </span>
    <span
      class="inline-flex shrink-0 items-center gap-1 text-[10.5px] font-bold"
      :class="difficultyClass"
    >
      <span class="size-1.5 rounded-full bg-current" />
      {{ t(`quest.difficulties.${item.difficulty}`) }}
    </span>

    <span class="min-w-0 flex-1 basis-40 truncate text-[13.5px] font-semibold">{{
      item.title
    }}</span>

    <span
      v-if="!item.dueToday"
      class="text-muted-foreground shrink-0 text-[11px] whitespace-nowrap"
    >
      {{ t('quest.notToday') }}
    </span>
    <span class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap">{{
      scheduleText
    }}</span>
    <span
      v-if="item.expectedGold !== null && item.expectedXp !== null"
      class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap"
    >
      {{ t('quest.rewardCard', { xp: item.expectedXp, gold: item.expectedGold }) }}
    </span>
    <Button
      v-if="item.canMarkToday"
      type="button"
      variant="outline"
      size="sm"
      class="w-auto shrink-0"
      :disabled="busy"
      @click="emit('mark')"
    >
      <Check class="size-3.5" />
      {{ t('quest.markToday') }}
    </Button>
    <span
      v-else-if="item.markedToday"
      class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap"
    >
      {{ t('quest.markedToday') }}
    </span>
    <Button
      v-if="item.schedule === 'deadline' && item.canComplete"
      type="button"
      size="sm"
      class="w-auto shrink-0"
      @click="emit('complete')"
    >
      {{ t('quest.completeButton') }}
    </Button>

    <div v-if="item.canAbandon" class="relative shrink-0" data-quest-menu>
      <button
        type="button"
        class="text-muted-foreground p-1"
        :aria-label="t('quest.menu')"
        :aria-expanded="menuOpen"
        @click="emit('toggleMenu')"
      >
        <Ellipsis class="size-[17px]" />
      </button>
      <div
        v-if="menuOpen"
        class="bg-surface border-border absolute top-9 right-0 z-10 w-[110px] overflow-hidden rounded-[10px] border shadow-lg"
      >
        <button
          type="button"
          class="text-destructive block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('abandon')"
        >
          {{ t('quest.abandon') }}
        </button>
      </div>
    </div>
  </article>
</template>
