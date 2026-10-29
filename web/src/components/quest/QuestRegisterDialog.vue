<script setup lang="ts">
import type {
  QuestCategory,
  QuestDifficulty,
  QuestKind,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_KINDS,
  QUEST_SCHEDULES,
  QUEST_TITLE_TEMPLATES,
  QUEST_WEEKDAYS,
  completionTableAmount,
  grantAmount,
  jobRewardMultiplier,
} from '@nest-vue/shared';
import { X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/composables/useApi';
import { createQuest } from '@/lib/quests';
import {
  calendarDaysBetween,
  isCalendarDate,
  seoulToday,
  seoulWeekday,
  sortWeekdays,
} from '@/lib/seoulDate';
import { useAuthStore } from '@/stores/auth';

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  created: [title: string];
  busy: [value: boolean];
}>();

const { t } = useI18n();
const auth = useAuthStore();

const kind = ref<QuestKind>('general');
const category = ref<QuestCategory>('exercise');
const title = ref('');
const difficulty = ref<QuestDifficulty>('normal');
const schedule = ref<QuestSchedule>('routine');
const weekdays = ref<QuestWeekday[]>([seoulWeekday()]);
const biweekly = ref(false);
const endsOn = ref(seoulToday());
const pending = ref(false);
const error = ref('');

const templates = computed(() => QUEST_TITLE_TEMPLATES[category.value]);
const routineReward = computed(() => {
  const jobClass = auth.user?.jobClass;
  if (schedule.value !== 'routine' || !jobClass) {
    return null;
  }
  const table = completionTableAmount(difficulty.value, 0, 0);
  const multiplier = jobRewardMultiplier(jobClass, category.value);
  return {
    gold: grantAmount(table.gold, table.markedDays, table.elapsedDays, multiplier, false),
    xp: grantAmount(table.xp, table.markedDays, table.elapsedDays, multiplier, false),
  };
});
// 기한 퀘스트는 기한날에 끝내고 매일 체크했을 때의 최대 보상을 보여 준다.
const deadlineMaxReward = computed(() => {
  const jobClass = auth.user?.jobClass;
  if (schedule.value !== 'deadline' || !jobClass || !isCalendarDate(endsOn.value)) {
    return null;
  }
  const daySpan = calendarDaysBetween(seoulToday(), endsOn.value);
  if (daySpan < 0) {
    return null;
  }
  const table = completionTableAmount(difficulty.value, daySpan, daySpan + 1);
  const multiplier = jobRewardMultiplier(jobClass, category.value);
  return {
    days: table.elapsedDays,
    gold: grantAmount(table.gold, table.markedDays, table.elapsedDays, multiplier, false),
    xp: grantAmount(table.xp, table.markedDays, table.elapsedDays, multiplier, false),
  };
});

watch(pending, (value) => {
  emit('busy', value);
});

function requestClose(): void {
  if (pending.value) {
    return;
  }
  emit('close');
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      return;
    }
    kind.value = 'general';
    category.value = 'exercise';
    title.value = '';
    difficulty.value = 'normal';
    schedule.value = 'routine';
    weekdays.value = [seoulWeekday()];
    biweekly.value = false;
    endsOn.value = seoulToday();
    pending.value = false;
    error.value = '';
  },
);

function toggleWeekday(day: QuestWeekday): void {
  const selected = new Set(weekdays.value);
  if (selected.has(day)) {
    selected.delete(day);
  } else {
    selected.add(day);
  }
  weekdays.value = sortWeekdays([...selected]);
}

function questErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.message.includes('endsOn must be today')) {
    return t('quest.errors.endsOn');
  }
  if (cause.message.includes('title must not be empty')) {
    return t('quest.errors.title');
  }
  return cause.message || t('quest.errors.generic');
}

async function onSubmit(): Promise<void> {
  error.value = '';
  const trimmed = title.value.trim();
  if (!trimmed) {
    error.value = t('quest.errors.title');
    return;
  }

  if (schedule.value === 'routine' && weekdays.value.length < 1) {
    error.value = t('quest.errors.weekdays');
    return;
  }

  if (schedule.value === 'deadline') {
    const remaining = isCalendarDate(endsOn.value)
      ? calendarDaysBetween(seoulToday(), endsOn.value)
      : -1;
    if (remaining < 0) {
      error.value = t('quest.errors.endsOn');
      return;
    }
  }

  pending.value = true;
  try {
    const quest = await createQuest(
      schedule.value === 'routine'
        ? {
            kind: kind.value,
            category: category.value,
            title: trimmed,
            difficulty: difficulty.value,
            schedule: 'routine',
            weekdays: weekdays.value,
            biweekly: biweekly.value,
          }
        : {
            kind: kind.value,
            category: category.value,
            title: trimmed,
            difficulty: difficulty.value,
            schedule: 'deadline',
            endsOn: endsOn.value,
          },
    );
    emit('created', quest.title);
    emit('close');
  } catch (cause) {
    const message = questErrorMessage(cause);
    if (message) {
      error.value = message;
    }
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-30 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('quest.close')"
      @click="requestClose"
    />
    <form
      class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-[22px] p-6 shadow-xl"
      @submit.prevent="onSubmit"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-bold">{{ t('quest.add') }}</h2>
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

      <div class="mb-4 flex gap-2">
        <Button
          v-for="value in QUEST_KINDS"
          :key="value"
          type="button"
          size="sm"
          class="w-auto flex-1"
          :variant="kind === value ? 'default' : 'outline'"
          @click="kind = value"
        >
          {{ t(`quest.kinds.${value}`) }}
        </Button>
      </div>

      <div class="mb-4 flex flex-wrap gap-2">
        <Button
          v-for="value in QUEST_CATEGORIES"
          :key="value"
          type="button"
          size="sm"
          class="w-auto"
          :variant="category === value ? 'default' : 'outline'"
          @click="category = value"
        >
          {{ t(`quest.categories.${value}`) }}
        </Button>
      </div>

      <div class="mb-4 flex flex-col gap-1">
        <Label for="quest-title">{{ t('quest.titleField') }}</Label>
        <Input
          id="quest-title"
          v-model="title"
          type="text"
          :placeholder="t('quest.titlePlaceholder')"
          @keydown.enter.prevent
        />
      </div>

      <p class="text-muted-foreground mb-2 text-[11.5px]">
        {{ t('quest.templates') }}
      </p>
      <div class="mb-4 flex flex-col gap-2">
        <button
          v-for="template in templates"
          :key="template"
          type="button"
          class="bg-muted flex items-center justify-between rounded-[14px] px-3.5 py-3 text-left"
          @click="title = template"
        >
          <span class="text-[13.5px] font-semibold">{{ template }}</span>
          <span class="text-primary text-[11.5px] font-bold">{{ t('quest.useTemplate') }}</span>
        </button>
      </div>

      <p class="text-muted-foreground mb-2 text-[11.5px]">
        {{ t('quest.difficulty') }}
      </p>
      <div class="mb-4 flex gap-2">
        <Button
          v-for="value in QUEST_DIFFICULTIES"
          :key="value"
          type="button"
          size="sm"
          class="w-auto flex-1"
          :variant="difficulty === value ? 'default' : 'outline'"
          @click="difficulty = value"
        >
          {{ t(`quest.difficulties.${value}`) }}
        </Button>
      </div>

      <p class="text-muted-foreground mb-2 text-[11.5px]">
        {{ t('quest.schedule') }}
      </p>
      <div class="mb-4 flex gap-2">
        <Button
          v-for="value in QUEST_SCHEDULES"
          :key="value"
          type="button"
          size="sm"
          class="w-auto flex-1"
          :variant="schedule === value ? 'default' : 'outline'"
          @click="schedule = value"
        >
          {{ t(`quest.schedules.${value}`) }}
        </Button>
      </div>

      <div v-if="schedule === 'routine'" class="mb-4">
        <p class="text-muted-foreground mb-2 text-[11.5px]">
          {{ t('quest.weekdaysLabel') }}
        </p>
        <div class="mb-3 flex flex-wrap gap-1.5">
          <Button
            v-for="day in QUEST_WEEKDAYS"
            :key="day"
            type="button"
            size="sm"
            class="w-auto px-3"
            :variant="weekdays.includes(day) ? 'default' : 'outline'"
            @click="toggleWeekday(day)"
          >
            {{ t(`quest.weekdays.${day}`) }}
          </Button>
        </div>
        <label
          class="text-secondary-foreground flex items-center gap-2 text-[12.5px] font-semibold"
        >
          <input v-model="biweekly" type="checkbox" class="accent-primary size-4" />
          {{ t('quest.biweekly') }}
        </label>
      </div>

      <div v-else class="mb-4 flex flex-col gap-1">
        <Label for="quest-ends-on">{{ t('quest.endsOn') }}</Label>
        <Input id="quest-ends-on" v-model="endsOn" type="date" :min="seoulToday()" />
      </div>

      <p v-if="routineReward" class="text-muted-foreground mb-4 text-[12px]">
        {{
          t('quest.rewardCard', {
            xp: routineReward.xp,
            gold: routineReward.gold,
          })
        }}
      </p>
      <div v-else-if="deadlineMaxReward" class="text-muted-foreground mb-4 text-[12px]">
        <p>
          {{
            t('quest.deadlineRewardMax', {
              days: deadlineMaxReward.days,
              xp: deadlineMaxReward.xp,
              gold: deadlineMaxReward.gold,
            })
          }}
        </p>
        <p class="mt-0.5 text-[11px]">{{ t('quest.deadlineRewardNote') }}</p>
      </div>

      <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>

      <Button type="submit" :disabled="pending">
        {{ pending ? t('quest.submitting') : t('quest.submit') }}
      </Button>
    </form>
  </div>
</template>
