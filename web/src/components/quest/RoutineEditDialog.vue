<script setup lang="ts">
import type {
  CreateRoutinePayload,
  QuestCategory,
  QuestDifficulty,
  QuestWeekday,
  Routine,
} from '@nest-vue/shared';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_TITLE_MAX,
  QUEST_WEEKDAYS,
} from '@nest-vue/shared';
import { X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/composables/useApi';
import { sortWeekdays } from '@/lib/appCalendar';
import { updateRoutine } from '@/lib/quests';

const props = defineProps<{
  routine: Routine;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
  busy: [value: boolean];
}>();

const { t } = useI18n();

const category = ref<QuestCategory>(props.routine.category);
const title = ref(props.routine.title);
const difficulty = ref<QuestDifficulty>(props.routine.difficulty);
const weekdays = ref<QuestWeekday[]>(sortWeekdays(props.routine.weekdays));
const biweekly = ref(props.routine.biweekly);
const pending = ref(false);
const error = ref('');

watch(
  () => props.routine,
  (routine) => {
    category.value = routine.category;
    title.value = routine.title;
    difficulty.value = routine.difficulty;
    weekdays.value = sortWeekdays(routine.weekdays);
    biweekly.value = routine.biweekly;
    pending.value = false;
    error.value = '';
  },
);

const everyDay = computed(() => weekdays.value.length === QUEST_WEEKDAYS.length);

function toggleEveryDay(): void {
  weekdays.value = everyDay.value ? [] : [...QUEST_WEEKDAYS];
}

function toggleWeekday(day: QuestWeekday): void {
  const selected = new Set(weekdays.value);
  if (selected.has(day)) {
    selected.delete(day);
  } else {
    selected.add(day);
  }
  weekdays.value = sortWeekdays([...selected]);
}

function sameWeekdays(left: readonly QuestWeekday[], right: readonly QuestWeekday[]): boolean {
  const sortedLeft = sortWeekdays(left);
  const sortedRight = sortWeekdays(right);
  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((day, index) => day === sortedRight[index])
  );
}

function changedFields(trimmed: string): Partial<CreateRoutinePayload> {
  const body: Partial<CreateRoutinePayload> = {};
  if (trimmed !== props.routine.title) {
    body.title = trimmed;
  }
  if (category.value !== props.routine.category) {
    body.category = category.value;
  }
  if (difficulty.value !== props.routine.difficulty) {
    body.difficulty = difficulty.value;
  }
  if (!sameWeekdays(weekdays.value, props.routine.weekdays)) {
    body.weekdays = sortWeekdays(weekdays.value);
  }
  if (biweekly.value !== props.routine.biweekly) {
    body.biweekly = biweekly.value;
  }
  return body;
}

function requestClose(): void {
  if (pending.value) {
    return;
  }
  emit('close');
}

function editErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  return t('quest.errors.generic');
}

async function onSubmit(): Promise<void> {
  error.value = '';
  const trimmed = title.value.trim();
  if (!trimmed) {
    error.value = t('quest.errors.title');
    return;
  }
  if (weekdays.value.length < 1) {
    error.value = t('quest.errors.weekdays');
    return;
  }

  const body = changedFields(trimmed);
  if (Object.keys(body).length === 0) {
    emit('close');
    return;
  }

  pending.value = true;
  emit('busy', true);
  let saved = false;
  try {
    await updateRoutine(props.routine.id, body);
    saved = true;
  } catch (cause) {
    const message = editErrorMessage(cause);
    if (message) {
      error.value = message;
    }
  } finally {
    pending.value = false;
    emit('busy', false);
  }
  if (saved) {
    emit('saved');
    emit('close');
  }
}
</script>

<template>
  <div class="fixed inset-0 z-30 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('quest.close')"
      @click="requestClose"
    />
    <form
      class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-[22px] p-[26px] shadow-xl"
      @submit.prevent="onSubmit"
    >
      <div class="mb-[18px] flex items-center justify-between">
        <h2 class="text-base font-bold">{{ t('quest.editTitle') }}</h2>
        <button
          type="button"
          class="bg-muted text-secondary-foreground flex size-7 items-center justify-center rounded-full"
          :aria-label="t('quest.close')"
          :disabled="pending"
          @click="requestClose"
        >
          <X class="size-3.5" />
        </button>
      </div>

      <Label for="routine-edit-title" class="text-muted-foreground mb-2 block font-normal">
        {{ t('quest.titleField') }}
      </Label>
      <Input
        id="routine-edit-title"
        v-model="title"
        type="text"
        :maxlength="QUEST_TITLE_MAX"
        class="mb-4"
        :placeholder="t('quest.routineTitlePlaceholder')"
        :disabled="pending"
      />

      <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.categoryLabel') }}</p>
      <div class="mb-4 grid grid-cols-3 gap-2">
        <Button
          v-for="value in QUEST_CATEGORIES"
          :key="value"
          type="button"
          size="sm"
          :variant="category === value ? 'default' : 'outline'"
          :disabled="pending"
          @click="category = value"
        >
          {{ t(`quest.categories.${value}`) }}
        </Button>
      </div>

      <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.difficulty') }}</p>
      <div class="mb-4 flex gap-1.5">
        <Button
          v-for="value in QUEST_DIFFICULTIES"
          :key="value"
          type="button"
          size="sm"
          class="w-auto flex-1"
          :variant="difficulty === value ? 'default' : 'outline'"
          :disabled="pending"
          @click="difficulty = value"
        >
          {{ t(`quest.difficulties.${value}`) }}
        </Button>
      </div>

      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-muted-foreground text-[11.5px]">{{ t('quest.weekdaysLabel') }}</p>
        <Button
          type="button"
          size="sm"
          class="w-auto"
          :variant="everyDay ? 'default' : 'outline'"
          :disabled="pending"
          @click="toggleEveryDay"
        >
          {{ t('quest.repeat.daily') }}
        </Button>
      </div>
      <div class="mb-2.5 flex gap-1.5">
        <Button
          v-for="day in QUEST_WEEKDAYS"
          :key="day"
          type="button"
          size="sm"
          class="w-auto min-w-0 flex-1 px-0"
          :variant="weekdays.includes(day) ? 'default' : 'outline'"
          :disabled="pending"
          @click="toggleWeekday(day)"
        >
          {{ t(`quest.weekdays.${day}`) }}
        </Button>
      </div>
      <label
        class="text-secondary-foreground mb-4 flex items-center gap-2 text-[12.5px] font-semibold"
      >
        <input
          v-model="biweekly"
          type="checkbox"
          class="accent-primary size-4"
          :disabled="pending"
        />
        {{ t('quest.biweekly') }}
      </label>

      <p v-if="error" class="text-destructive mb-2.5 text-[12px]">{{ error }}</p>
      <p
        class="bg-muted text-secondary-foreground mb-[18px] rounded-xl px-3.5 py-[11px] text-[11.5px] leading-normal"
      >
        {{ t('quest.editNotice') }}
      </p>

      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto flex-1"
          :disabled="pending"
          @click="requestClose"
        >
          {{ t('quest.cancel') }}
        </Button>
        <Button type="submit" size="sm" class="w-auto flex-1" :disabled="pending">
          {{ t('quest.save') }}
        </Button>
      </div>
    </form>
  </div>
</template>
