<script setup lang="ts">
import type { Routine } from '@nest-vue/shared';
import { Check, Ellipsis } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import type { QuestListItem } from '@/lib/quests';

const props = defineProps<{
  item: QuestListItem | Routine;
  menuOpen: boolean;
  busy: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  mark: [];
  toggleMenu: [];
  abandon: [];
  rest: [];
  resume: [];
  edit: [];
}>();

const { t } = useI18n();

function isRoutine(item: QuestListItem | Routine): item is Routine {
  return 'weekdays' in item;
}

const routine = computed(() => (isRoutine(props.item) ? props.item : null));
const quest = computed(() => (isRoutine(props.item) ? null : props.item));

const done = computed(() => quest.value?.completed ?? false);

const scheduleText = computed(() => {
  const current = routine.value;
  if (!current) {
    return t('quest.repeat.deadline', { date: quest.value?.endsOn ?? '' });
  }
  if (current.weekdays.length === 7 && !current.biweekly) {
    return t('quest.repeat.daily');
  }
  const days = current.weekdays.map((weekday) => t(`quest.weekdays.${weekday}`)).join('·');
  if (current.biweekly) {
    return t('quest.repeat.biweekly', { days });
  }
  return days;
});

const canEdit = computed(() => routine.value !== null && routine.value.bossId === null);
const monsterGenerating = computed(() => routine.value?.monsterStatus === 'generating');
const canPause = computed(
  () => routine.value !== null && routine.value.bossId === null && routine.value.active,
);
const canResume = computed(
  () => routine.value !== null && routine.value.bossId === null && !routine.value.active,
);
const canDelete = computed(() => {
  if (routine.value) {
    return routine.value.bossId === null;
  }
  return quest.value?.canAbandon === true;
});
const showMenu = computed(
  () => canEdit.value || canPause.value || canResume.value || canDelete.value,
);

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
      v-if="quest && !quest.dueToday"
      class="text-muted-foreground shrink-0 text-[11px] whitespace-nowrap"
    >
      {{ t('quest.notToday') }}
    </span>
    <span class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap">{{
      scheduleText
    }}</span>
    <span
      v-if="quest && quest.expectedGold !== null && quest.expectedXp !== null"
      class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap"
    >
      {{ t('quest.rewardCard', { xp: quest.expectedXp, gold: quest.expectedGold }) }}
    </span>
    <Button
      v-if="quest?.canMarkToday"
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
      v-else-if="quest?.markedToday"
      class="text-muted-foreground flex shrink-0 flex-col items-end leading-tight whitespace-nowrap"
    >
      <span class="text-[11.5px]">{{ t('quest.markedToday') }}</span>
      <span class="text-[10.5px] opacity-70">{{ t('quest.markedTodayNote') }}</span>
    </span>
    <Button
      v-if="quest?.canComplete"
      type="button"
      size="sm"
      class="w-auto shrink-0"
      @click="emit('complete')"
    >
      {{ t('quest.completeButton') }}
    </Button>
    <Button
      v-if="canResume"
      type="button"
      size="sm"
      class="w-auto shrink-0"
      :disabled="busy"
      @click="emit('resume')"
    >
      {{ t('quest.rest.resume') }}
    </Button>

    <div v-if="showMenu" class="relative shrink-0" data-quest-menu>
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
        class="bg-surface border-border absolute top-9 right-0 z-10 overflow-hidden rounded-[10px] border shadow-lg"
        :class="canEdit && monsterGenerating ? 'w-max' : 'w-[110px]'"
      >
        <div v-if="canEdit && monsterGenerating" class="flex items-center">
          <button
            type="button"
            class="text-muted-foreground cursor-not-allowed px-3.5 py-2.5 text-left text-[12.5px] font-bold"
            disabled
          >
            {{ t('quest.edit') }}
          </button>
          <span class="text-muted-foreground pr-3.5 text-[10.5px] whitespace-nowrap">
            {{ t('quest.monsterGenerating') }}
          </span>
        </div>
        <button
          v-else-if="canEdit"
          type="button"
          class="block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('edit')"
        >
          {{ t('quest.edit') }}
        </button>
        <button
          v-if="canPause"
          type="button"
          class="block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('rest')"
        >
          {{ t('quest.rest.action') }}
        </button>
        <button
          v-if="canDelete"
          type="button"
          class="text-destructive block w-full px-3.5 py-2.5 text-left text-[12.5px] font-bold"
          @click="emit('abandon')"
        >
          {{ routine ? t('quest.delete') : t('quest.abandon') }}
        </button>
      </div>
    </div>
  </article>
</template>
