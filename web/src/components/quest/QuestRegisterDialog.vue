<script setup lang="ts">
import type {
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  calendarDaysBetween,
  DAILY_AI_BUTTON_LIMIT_CODE,
  DAILY_QUEST_CREATE_LIMIT_CODE,
  isCalendarDate,
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_PACES,
  QUEST_SCHEDULES,
  QUEST_TITLE_MAX,
  QUEST_TITLE_TEMPLATES,
  QUEST_WEEKDAYS,
  weekdayOfCalendarDate,
} from '@nest-vue/shared';
import { Star, X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/composables/useApi';
import { appCalendarDate, sortWeekdays } from '@/lib/appCalendar';
import { formatAmount } from '@/lib/formatAmount';
import { estimatedRegisterReward } from '@/lib/questReward';
import { createQuest, createRoutine, recommendDifficulty } from '@/lib/quests';
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

const category = ref<QuestCategory>('exercise');
const title = ref('');
const difficulty = ref<QuestDifficulty>('normal');
const schedule = ref<QuestSchedule>('routine');
const pace = ref<QuestPace>('steady');
const weekdays = ref<QuestWeekday[]>([weekdayOfCalendarDate(appCalendarDate())]);
const biweekly = ref(false);
const endsOn = ref(appCalendarDate());
const pending = ref(false);
const error = ref('');
const recommendState = ref<'idle' | 'pending' | 'ready' | 'failed'>('idle');
const recommendLimit = ref(false);
const recommendReason = ref('');
let recommendGeneration = 0;

const templates = computed(() => QUEST_TITLE_TEMPLATES[category.value]);
const routineReward = computed(() => {
  const jobClass = auth.user?.jobClass;
  if (schedule.value !== 'routine' || !jobClass) {
    return null;
  }
  return estimatedRegisterReward({
    schedule: 'routine',
    difficulty: difficulty.value,
    category: category.value,
    jobClass,
  });
});
// 기한 퀘스트는 기한날에 끝내고 매일 체크했을 때의 최대 보상을 보여 준다.
const deadlineMaxReward = computed(() => {
  const jobClass = auth.user?.jobClass;
  if (schedule.value !== 'deadline' || pace.value !== 'steady' || !jobClass) {
    return null;
  }
  return estimatedRegisterReward({
    schedule: 'deadline',
    difficulty: difficulty.value,
    category: category.value,
    jobClass,
    pace: 'steady',
    endsOn: endsOn.value,
  });
});
const deadlineOnceReward = computed(() => {
  const jobClass = auth.user?.jobClass;
  if (schedule.value !== 'deadline' || pace.value !== 'once' || !jobClass) {
    return null;
  }
  return estimatedRegisterReward({
    schedule: 'deadline',
    difficulty: difficulty.value,
    category: category.value,
    jobClass,
    pace: 'once',
    endsOn: endsOn.value,
  });
});
const everyDay = computed(() => weekdays.value.length === QUEST_WEEKDAYS.length);
const canSubmit = computed(() => {
  if (pending.value || title.value.trim().length < 1) {
    return false;
  }
  if (schedule.value === 'routine') {
    return weekdays.value.length > 0;
  }
  if (!isCalendarDate(endsOn.value)) {
    return false;
  }
  return calendarDaysBetween(appCalendarDate(), endsOn.value) >= 0;
});
const canRecommend = computed(
  () => title.value.trim().length > 0 && recommendState.value !== 'pending' && !pending.value,
);

watch(pending, (value) => {
  emit('busy', value);
});

function clearRecommendation(): void {
  recommendGeneration += 1;
  recommendState.value = 'idle';
  recommendLimit.value = false;
  recommendReason.value = '';
}

watch(category, () => {
  clearRecommendation();
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
    category.value = 'exercise';
    title.value = '';
    difficulty.value = 'normal';
    schedule.value = 'routine';
    pace.value = 'steady';
    weekdays.value = [weekdayOfCalendarDate(appCalendarDate())];
    biweekly.value = false;
    endsOn.value = appCalendarDate();
    pending.value = false;
    error.value = '';
    clearRecommendation();
  },
);

function toggleEveryDay(): void {
  weekdays.value = everyDay.value ? [] : [...QUEST_WEEKDAYS];
}

async function onRecommend(): Promise<void> {
  if (!canRecommend.value) {
    return;
  }
  const generation = ++recommendGeneration;
  recommendState.value = 'pending';
  recommendLimit.value = false;
  recommendReason.value = '';
  try {
    const result = await recommendDifficulty({
      title: title.value.trim(),
      category: category.value,
    });
    if (generation !== recommendGeneration) {
      return;
    }
    difficulty.value = result.difficulty;
    recommendReason.value = result.reason;
    recommendState.value = 'ready';
  } catch (cause) {
    if (generation !== recommendGeneration) {
      return;
    }
    recommendLimit.value = cause instanceof ApiError && cause.code === DAILY_AI_BUTTON_LIMIT_CODE;
    recommendState.value = 'failed';
  }
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

function questErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.code === DAILY_QUEST_CREATE_LIMIT_CODE) {
    return t('quest.errors.dailyCreateLimit');
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
      ? calendarDaysBetween(appCalendarDate(), endsOn.value)
      : -1;
    if (remaining < 0) {
      error.value = t('quest.errors.endsOn');
      return;
    }
  }

  pending.value = true;
  try {
    const created =
      schedule.value === 'routine'
        ? await createRoutine({
            category: category.value,
            title: trimmed,
            difficulty: difficulty.value,
            weekdays: weekdays.value,
            biweekly: biweekly.value,
          })
        : await createQuest({
            category: category.value,
            title: trimmed,
            difficulty: difficulty.value,
            pace: pace.value,
            endsOn: endsOn.value,
          });
    emit('created', created.title);
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

      <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.kindLabel') }}</p>
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
          {{ value === 'deadline' ? t('quest.deadlineQuest') : t(`quest.schedules.${value}`) }}
        </Button>
      </div>

      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-muted-foreground text-[11.5px]">{{ t('quest.difficulty') }}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          class="bg-gold-soft text-gold hover:bg-gold-soft hover:text-gold w-auto border-0 [&_svg]:size-3"
          :disabled="!canRecommend"
          @click="onRecommend"
        >
          <Star class="size-3 fill-current" />
          {{ t('quest.recommend') }}
        </Button>
      </div>
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

      <p
        v-if="recommendState === 'pending'"
        class="text-muted-foreground mb-4 animate-pulse text-[12.5px]"
      >
        {{ t('quest.recommending') }}
      </p>
      <p
        v-else-if="recommendState === 'ready'"
        class="text-secondary-foreground mb-4 flex items-start gap-1.5 text-[12.5px]"
      >
        <Star class="text-gold mt-0.5 size-3.5 shrink-0" />
        <span>{{ recommendReason }}</span>
      </p>
      <p
        v-else-if="recommendState === 'failed'"
        class="text-muted-foreground mb-4 flex items-center gap-2 text-[12.5px]"
      >
        <span>{{ t(recommendLimit ? 'quest.recommendLimit' : 'quest.recommendFailed') }}</span>
        <button
          v-if="!recommendLimit"
          type="button"
          class="text-primary font-bold"
          @click="onRecommend"
        >
          {{ t('quest.retry') }}
        </button>
      </p>

      <template v-if="schedule === 'routine'">
        <div class="mb-4 flex flex-col gap-1">
          <Label for="quest-title">{{ t('quest.titleField') }}</Label>
          <Input
            id="quest-title"
            v-model="title"
            type="text"
            :maxlength="QUEST_TITLE_MAX"
            :placeholder="t('quest.titlePlaceholder')"
            @keydown.enter.prevent
          />
        </div>
        <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.templates') }}</p>
        <div class="mb-4 flex flex-col gap-2">
          <button
            v-for="template in templates"
            :key="template"
            type="button"
            class="bg-muted hover:border-border group flex items-center justify-between rounded-[14px] border border-transparent px-3.5 py-3 text-left"
            @click="title = template"
          >
            <span class="text-[13.5px] font-semibold">{{ template }}</span>
            <span
              class="text-primary text-[11.5px] font-bold underline-offset-2 group-hover:underline"
              >{{ t('quest.useTemplate') }}</span
            >
          </button>
        </div>
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-muted-foreground text-[11.5px]">{{ t('quest.weekdaysLabel') }}</p>
          <Button
            type="button"
            size="sm"
            class="w-auto"
            :variant="everyDay ? 'default' : 'outline'"
            @click="toggleEveryDay"
          >
            {{ t('quest.repeat.daily') }}
          </Button>
        </div>
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
          class="text-secondary-foreground mb-4 flex items-center gap-2 text-[12.5px] font-semibold"
        >
          <input v-model="biweekly" type="checkbox" class="accent-primary size-4" />
          {{ t('quest.biweekly') }}
        </label>
      </template>

      <template v-else>
        <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.pace') }}</p>
        <div class="mb-4 flex gap-2">
          <Button
            v-for="value in QUEST_PACES"
            :key="value"
            type="button"
            size="sm"
            class="w-auto flex-1"
            :variant="pace === value ? 'default' : 'outline'"
            @click="pace = value"
          >
            {{ t(`quest.paces.${value}`) }}
          </Button>
        </div>
        <div class="mb-4 flex flex-col gap-1">
          <Label for="quest-title">{{ t('quest.titleField') }}</Label>
          <Input
            id="quest-title"
            v-model="title"
            type="text"
            :maxlength="QUEST_TITLE_MAX"
            :placeholder="t('quest.titlePlaceholder')"
            @keydown.enter.prevent
          />
        </div>
        <div class="mb-4 flex flex-col gap-1">
          <Label for="quest-ends-on">{{ t('quest.endsOn') }}</Label>
          <Input id="quest-ends-on" v-model="endsOn" type="date" :min="appCalendarDate()" />
        </div>
      </template>

      <p v-if="routineReward" class="text-muted-foreground mb-4 text-[12px]">
        {{
          t('quest.rewardCard', {
            xp: formatAmount(routineReward.xp),
            gold: formatAmount(routineReward.gold),
          })
        }}
      </p>
      <p v-else-if="deadlineOnceReward" class="text-muted-foreground mb-4 text-[12px]">
        {{
          t('quest.rewardCard', {
            xp: formatAmount(deadlineOnceReward.xp),
            gold: formatAmount(deadlineOnceReward.gold),
          })
        }}
      </p>
      <div v-else-if="deadlineMaxReward" class="text-muted-foreground mb-4 text-[12px]">
        <p>
          {{
            t('quest.deadlineRewardMax', {
              days: deadlineMaxReward.days,
              xp: formatAmount(deadlineMaxReward.xp),
              gold: formatAmount(deadlineMaxReward.gold),
            })
          }}
        </p>
        <p class="mt-0.5 text-[11px]">{{ t('quest.deadlineRewardNote') }}</p>
      </div>

      <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>

      <Button type="submit" :disabled="!canSubmit">
        {{ pending ? t('quest.submitting') : t('quest.submit') }}
      </Button>
    </form>
  </div>
</template>
