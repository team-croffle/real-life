<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import MonsterImage from '@/components/quest/MonsterImage.vue';
import type { MonsterViewTarget } from '@/components/quest/MonsterViewDialog.vue';
import { Button } from '@/components/ui/button';
import { isQuestDone } from '@/composables/useQuestBoard';
import type { QuestListItem } from '@/lib/quests';

const props = defineProps<{
  item: QuestListItem;
  busy: boolean;
}>();

const emit = defineEmits<{
  complete: [];
  mark: [];
  viewMonster: [MonsterViewTarget];
}>();

const { t } = useI18n();

const done = computed(() => isQuestDone(props.item));
const readyMonster = computed(() =>
  props.item.monsterStatus === 'ready' && props.item.monster ? props.item.monster : null,
);

function openMonster(): void {
  const monster = readyMonster.value;
  if (!monster) {
    return;
  }
  emit('viewMonster', {
    name: monster.name,
    imageKey: monster.imageKey,
    description: monster.description,
    title: props.item.title,
  });
}

const difficultyClass = computed(() => {
  if (props.item.difficulty === 'easy') {
    return 'text-primary';
  }
  if (props.item.difficulty === 'hard') {
    return 'text-destructive';
  }
  return 'text-intel';
});

const reward = computed(() => {
  if (props.item.expectedGold === null || props.item.expectedXp === null) {
    return '';
  }
  return t('home.reward', {
    xp: props.item.expectedXp,
    gold: props.item.expectedGold,
  });
});
</script>

<template>
  <article
    class="bg-surface border-border flex flex-wrap items-center gap-2.5 rounded-[14px] border px-3.5 py-3"
    :class="done ? 'opacity-[0.42]' : undefined"
  >
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
    <div class="flex min-w-0 flex-1 basis-36 flex-col gap-0.5">
      <button
        v-if="readyMonster"
        type="button"
        class="text-muted-foreground flex min-w-0 items-center gap-1.5 text-left"
        @click="openMonster"
      >
        <MonsterImage :image-key="readyMonster.imageKey" size="thumb" />
        <span class="truncate text-[11.5px]">{{ item.title }}</span>
      </button>
      <span class="truncate text-[13.5px]" :class="readyMonster ? 'font-bold' : 'font-semibold'">
        {{ readyMonster ? readyMonster.name : item.title }}
      </span>
    </div>
    <span v-if="reward" class="text-muted-foreground shrink-0 text-[11.5px] whitespace-nowrap">
      {{ reward }}
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
      class="text-muted-foreground flex shrink-0 flex-col items-end leading-tight whitespace-nowrap"
    >
      <span class="text-[11.5px]">{{ t('quest.markedToday') }}</span>
      <span class="text-[10.5px] opacity-70">{{ t('quest.markedTodayNote') }}</span>
    </span>
    <div
      v-if="done"
      class="quest-check bg-muted border-border flex size-5 shrink-0 items-center justify-center rounded-full border"
    >
      <Check class="text-muted-foreground size-2.5" :stroke-width="3.4" />
    </div>
    <Button
      v-else-if="item.canComplete"
      type="button"
      size="sm"
      class="w-auto shrink-0"
      @click="emit('complete')"
    >
      {{ t('quest.completeButton') }}
    </Button>
    <div v-else class="size-5 shrink-0" />
  </article>
</template>
