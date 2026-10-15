<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

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
}>();

const { t } = useI18n();

const done = computed(() => isQuestDone(props.item));

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
  return t('home.reward', { xp: props.item.expectedXp, gold: props.item.expectedGold });
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
    <span class="min-w-0 flex-1 basis-36 truncate text-[13.5px] font-semibold">{{
      item.title
    }}</span>
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
      {{ t('quest.markToday') }}
    </Button>
    <div
      v-if="done"
      class="quest-check bg-muted border-border flex size-5 shrink-0 items-center justify-center rounded-full border"
    >
      <Check class="text-muted-foreground size-2.5" :stroke-width="3.4" />
    </div>
    <button
      v-else-if="item.canComplete"
      type="button"
      class="border-primary size-5 shrink-0 rounded-full border-2 bg-transparent"
      :aria-label="t('quest.complete')"
      @click="emit('complete')"
    />
    <div v-else class="size-5 shrink-0" />
  </article>
</template>
