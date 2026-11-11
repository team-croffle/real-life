<script setup lang="ts">
import type {
  QuestCategory,
  QuestDifficulty,
  QuestPace,
  QuestPlanQuest,
  QuestSchedule,
  QuestWeekday,
} from '@nest-vue/shared';
import {
  BOSS_SUBQUEST_MAX,
  bossQuestHp,
  calendarDaysBetween,
  isCalendarDate,
  QUEST_CATEGORIES,
  QUEST_DIFFICULTIES,
  QUEST_DIFFICULTY_SCORES,
  QUEST_PACES,
  QUEST_TITLE_MAX,
  QUEST_WEEKDAYS,
  routineOccurrenceCount,
  weekdayOfCalendarDate,
} from '@nest-vue/shared';
import { Sword, X } from 'lucide-vue-next';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@/composables/useApi';
import { appCalendarDate, sortWeekdays } from '@/lib/appCalendar';
import { confirmBoss, suggestQuestPlan } from '@/lib/bosses';

type DraftRoutine = {
  key: string;
  schedule: 'routine';
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  weekdays: QuestWeekday[];
  biweekly: boolean;
};

type DraftDeadline = {
  key: string;
  schedule: 'deadline';
  title: string;
  category: QuestCategory;
  difficulty: QuestDifficulty;
  pace: QuestPace;
  endsOn: string;
};

type DraftItem = DraftRoutine | DraftDeadline;

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  created: [];
  busy: [value: boolean];
}>();

const { t } = useI18n();
const router = useRouter();

const category = ref<QuestCategory>('exercise');
const goal = ref('');
const deadlineOn = ref(appCalendarDate());
const stage = ref<'input' | 'preview'>('input');
const planning = ref(false);
const planFailed = ref(false);
const items = ref<DraftItem[]>([]);
const pending = ref(false);
const error = ref('');
const editor = ref<DraftItem | null>(null);
const editorError = ref('');

let planGeneration = 0;
let nextKey = 1;

const everyDay = computed(
  () =>
    editor.value?.schedule === 'routine' && editor.value.weekdays.length === QUEST_WEEKDAYS.length,
);

const canAskPlan = computed(() => {
  if (planning.value || pending.value || goal.value.trim().length < 1) {
    return false;
  }
  if (!isCalendarDate(deadlineOn.value)) {
    return false;
  }
  return calendarDaysBetween(appCalendarDate(), deadlineOn.value) >= 0;
});

const atLimit = computed(() => items.value.length >= BOSS_SUBQUEST_MAX);

const totalHp = computed(() => items.value.reduce((sum, item) => sum + itemHp(item), 0));

watch(pending, (value) => {
  emit('busy', value);
});

watch(
  () => props.open,
  (open) => {
    if (!open) {
      bumpPlan();
      return;
    }
    resetForm();
  },
);

function bumpPlan(): void {
  planGeneration += 1;
  planning.value = false;
}

function resetForm(): void {
  bumpPlan();
  category.value = 'exercise';
  goal.value = '';
  deadlineOn.value = appCalendarDate();
  stage.value = 'input';
  planFailed.value = false;
  items.value = [];
  pending.value = false;
  error.value = '';
  editor.value = null;
  editorError.value = '';
}

function requestClose(): void {
  if (pending.value || planning.value) {
    return;
  }
  emit('close');
}

function rebuild(): void {
  if (pending.value) {
    return;
  }
  bumpPlan();
  stage.value = 'input';
  planFailed.value = false;
  items.value = [];
  error.value = '';
  editor.value = null;
}

function itemTimes(item: DraftItem): number {
  if (item.schedule === 'deadline') {
    return 1;
  }
  return routineOccurrenceCount(item, appCalendarDate(), deadlineOn.value);
}

function itemHp(item: DraftItem): number {
  return bossQuestHp(itemTimes(item), item.difficulty);
}

function fromPlanQuest(quest: QuestPlanQuest): DraftItem {
  const key = String(nextKey);
  nextKey += 1;
  if (quest.schedule === 'routine') {
    return {
      key,
      schedule: 'routine',
      title: quest.title,
      category: quest.category,
      difficulty: quest.difficulty,
      weekdays: quest.weekdays ?? [weekdayOfCalendarDate(appCalendarDate())],
      biweekly: quest.biweekly ?? false,
    };
  }
  return {
    key,
    schedule: 'deadline',
    title: quest.title,
    category: quest.category,
    difficulty: quest.difficulty,
    pace: quest.pace ?? 'steady',
    endsOn: quest.endsOn ?? deadlineOn.value,
  };
}

async function onAskPlan(): Promise<void> {
  if (!canAskPlan.value) {
    return;
  }
  const generation = ++planGeneration;
  planning.value = true;
  planFailed.value = false;
  error.value = '';
  try {
    const plan = await suggestQuestPlan({
      goal: goal.value.trim(),
      deadlineOn: deadlineOn.value,
    });
    if (generation !== planGeneration) {
      return;
    }
    items.value = plan.quests.map(fromPlanQuest);
    stage.value = 'preview';
  } catch {
    if (generation !== planGeneration) {
      return;
    }
    planFailed.value = true;
    items.value = [];
    stage.value = 'preview';
  } finally {
    if (generation === planGeneration) {
      planning.value = false;
    }
  }
}

function emptyRoutine(): DraftRoutine {
  const key = String(nextKey);
  nextKey += 1;
  return {
    key,
    schedule: 'routine',
    title: '',
    category: category.value,
    difficulty: 'normal',
    weekdays: [weekdayOfCalendarDate(appCalendarDate())],
    biweekly: false,
  };
}

function emptyDeadline(): DraftDeadline {
  const key = String(nextKey);
  nextKey += 1;
  return {
    key,
    schedule: 'deadline',
    title: '',
    category: category.value,
    difficulty: 'normal',
    pace: 'steady',
    endsOn: deadlineOn.value,
  };
}

function openAdd(schedule: QuestSchedule): void {
  if (atLimit.value) {
    return;
  }
  editorError.value = '';
  editor.value = schedule === 'routine' ? emptyRoutine() : emptyDeadline();
}

function openEdit(item: DraftItem): void {
  editorError.value = '';
  editor.value =
    item.schedule === 'routine' ? { ...item, weekdays: [...item.weekdays] } : { ...item };
}

function closeEditor(): void {
  editor.value = null;
  editorError.value = '';
}

function toggleEveryDay(): void {
  const current = editor.value;
  if (!current || current.schedule !== 'routine') {
    return;
  }
  current.weekdays = everyDay.value ? [] : [...QUEST_WEEKDAYS];
}

function toggleWeekday(day: QuestWeekday): void {
  const current = editor.value;
  if (!current || current.schedule !== 'routine') {
    return;
  }
  const selected = new Set(current.weekdays);
  if (selected.has(day)) {
    selected.delete(day);
  } else {
    selected.add(day);
  }
  current.weekdays = sortWeekdays([...selected]);
}

function saveEditor(): void {
  const current = editor.value;
  if (!current) {
    return;
  }
  const title = current.title.trim();
  if (title.length < 1) {
    editorError.value = t('quest.errors.title');
    return;
  }
  if (current.schedule === 'routine') {
    if (current.weekdays.length < 1) {
      editorError.value = t('quest.errors.weekdays');
      return;
    }
  } else {
    if (!isCalendarDate(current.endsOn)) {
      editorError.value = t('quest.errors.endsOn');
      return;
    }
    const fromToday = calendarDaysBetween(appCalendarDate(), current.endsOn);
    const untilBoss = calendarDaysBetween(current.endsOn, deadlineOn.value);
    if (fromToday < 0 || untilBoss < 0) {
      editorError.value = t('quest.errors.endsOn');
      return;
    }
  }
  const saved = { ...current, title };
  const index = items.value.findIndex((item) => item.key === saved.key);
  if (index === -1) {
    items.value = [...items.value, saved];
  } else {
    const next = [...items.value];
    next[index] = saved;
    items.value = next;
  }
  closeEditor();
}

function removeItem(key: string): void {
  items.value = items.value.filter((item) => item.key !== key);
}

function confirmErrorMessage(cause: unknown): string {
  if (!(cause instanceof ApiError) || cause.status === 401) {
    return '';
  }
  if (cause.status === 409) {
    return t('boss.activeMax');
  }
  if (cause.status === 400) {
    return cause.message || t('quest.errors.generic');
  }
  return cause.message || t('quest.errors.generic');
}

async function onConfirm(): Promise<void> {
  error.value = '';
  const trimmed = goal.value.trim();
  if (!trimmed || !isCalendarDate(deadlineOn.value) || items.value.length < 1) {
    return;
  }
  pending.value = true;
  try {
    const created = await confirmBoss({
      goal: trimmed,
      category: category.value,
      deadlineOn: deadlineOn.value,
      quests: items.value.map((item) =>
        item.schedule === 'routine'
          ? {
              title: item.title,
              category: item.category,
              difficulty: item.difficulty,
              schedule: 'routine' as const,
              weekdays: item.weekdays,
              biweekly: item.biweekly,
            }
          : {
              title: item.title,
              category: item.category,
              difficulty: item.difficulty,
              schedule: 'deadline' as const,
              pace: item.pace,
              endsOn: item.endsOn,
            },
      ),
    });
    emit('created');
    emit('close');
    await router.push({ path: '/bosses', query: { id: created.id, created: '1' } });
  } catch (cause) {
    const message = confirmErrorMessage(cause);
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
    <div
      class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-[22px] p-6 shadow-xl"
    >
      <div class="mb-4 flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-base font-bold">
          <Sword class="text-gold size-4" />
          {{ t('boss.create') }}
        </h2>
        <button
          type="button"
          class="bg-muted text-secondary-foreground flex size-7 items-center justify-center rounded-full"
          :aria-label="t('quest.close')"
          :disabled="pending || planning"
          @click="requestClose"
        >
          <X class="size-3.5" />
        </button>
      </div>

      <template v-if="stage === 'input'">
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
          <Label for="boss-goal">{{ t('boss.goal') }}</Label>
          <Input
            id="boss-goal"
            v-model="goal"
            type="text"
            :maxlength="QUEST_TITLE_MAX"
            :placeholder="t('boss.goalPlaceholder')"
          />
        </div>
        <div class="mb-4 flex flex-col gap-1">
          <Label for="boss-deadline">{{ t('boss.deadlineOn') }}</Label>
          <Input id="boss-deadline" v-model="deadlineOn" type="date" />
        </div>
        <p v-if="planning" class="text-muted-foreground mb-3 animate-pulse text-[12.5px]">
          {{ t('boss.planning') }}
        </p>
        <Button type="button" class="w-full" :disabled="!canAskPlan" @click="onAskPlan">
          {{ t('boss.askPlan') }}
        </Button>
      </template>

      <template v-else>
        <p v-if="planFailed" class="text-secondary-foreground mb-4 text-[12.5px]">
          {{ t('boss.planFailed') }}
        </p>
        <h3 class="mb-3 text-[13px] font-bold">{{ t('boss.previewTitle') }}</h3>
        <ul class="mb-3 flex flex-col gap-2">
          <li v-for="item in items" :key="item.key" class="bg-muted rounded-[14px] px-3.5 py-3">
            <div class="flex items-start justify-between gap-2">
              <button type="button" class="min-w-0 flex-1 text-left" @click="openEdit(item)">
                <p class="text-[13px] font-semibold">
                  [{{ t(`quest.schedules.${item.schedule}`) }}] {{ item.title }}
                  {{ t(`quest.categories.${item.category}`) }}
                </p>
                <p class="text-muted-foreground mt-1 text-[11.5px]">
                  {{
                    item.schedule === 'routine'
                      ? t('boss.routineHp', {
                          times: itemTimes(item),
                          difficulty: t(`quest.difficulties.${item.difficulty}`),
                          score: QUEST_DIFFICULTY_SCORES[item.difficulty],
                          hp: itemHp(item),
                        })
                      : t('boss.deadlineHp', {
                          difficulty: t(`quest.difficulties.${item.difficulty}`),
                          score: QUEST_DIFFICULTY_SCORES[item.difficulty],
                          hp: itemHp(item),
                        })
                  }}
                </p>
              </button>
              <button
                type="button"
                class="text-muted-foreground p-1"
                :aria-label="t('quest.close')"
                @click="removeItem(item.key)"
              >
                <X class="size-3.5" />
              </button>
            </div>
          </li>
        </ul>
        <p class="mb-3 text-[13px] font-bold">{{ t('boss.expectedHp', { hp: totalHp }) }}</p>
        <div class="mb-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto flex-1"
            :disabled="atLimit"
            @click="openAdd('routine')"
          >
            {{ t('boss.addRoutine') }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="w-auto flex-1"
            :disabled="atLimit"
            @click="openAdd('deadline')"
          >
            {{ t('boss.addDeadline') }}
          </Button>
        </div>
        <p class="text-secondary-foreground mb-3 text-[12px]">{{ t('boss.confirmWarning') }}</p>
        <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>
        <div class="flex gap-2">
          <Button
            type="button"
            variant="outline"
            class="w-auto flex-1"
            :disabled="pending"
            @click="rebuild"
          >
            {{ t('boss.rebuild') }}
          </Button>
          <Button
            type="button"
            class="w-auto flex-1"
            :disabled="pending || items.length < 1"
            @click="onConfirm"
          >
            {{ pending ? t('boss.confirming') : t('boss.confirm') }}
          </Button>
        </div>
      </template>
    </div>

    <div v-if="editor" class="fixed inset-0 z-40 flex items-center justify-center px-4">
      <button
        type="button"
        class="bg-overlay absolute inset-0"
        :aria-label="t('quest.cancel')"
        @click="closeEditor"
      />
      <div
        class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[400px] overflow-y-auto rounded-[18px] p-5 shadow-xl"
      >
        <h3 class="mb-3 text-[15px] font-bold">{{ t('boss.editItem') }}</h3>
        <div class="mb-3 flex flex-col gap-1">
          <Label for="boss-item-title">{{ t('quest.titleField') }}</Label>
          <Input
            id="boss-item-title"
            v-model="editor.title"
            type="text"
            :maxlength="QUEST_TITLE_MAX"
          />
        </div>
        <div class="mb-3 flex flex-wrap gap-2">
          <Button
            v-for="value in QUEST_CATEGORIES"
            :key="value"
            type="button"
            size="sm"
            class="w-auto"
            :variant="editor.category === value ? 'default' : 'outline'"
            @click="editor.category = value"
          >
            {{ t(`quest.categories.${value}`) }}
          </Button>
        </div>
        <div class="mb-3 flex gap-2">
          <Button
            v-for="value in QUEST_DIFFICULTIES"
            :key="value"
            type="button"
            size="sm"
            class="w-auto flex-1"
            :variant="editor.difficulty === value ? 'default' : 'outline'"
            @click="editor.difficulty = value"
          >
            {{ t(`quest.difficulties.${value}`) }}
          </Button>
        </div>
        <template v-if="editor.schedule === 'routine'">
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
              :variant="editor.weekdays.includes(day) ? 'default' : 'outline'"
              @click="toggleWeekday(day)"
            >
              {{ t(`quest.weekdays.${day}`) }}
            </Button>
          </div>
          <label
            class="text-secondary-foreground mb-4 flex items-center gap-2 text-[12.5px] font-semibold"
          >
            <input v-model="editor.biweekly" type="checkbox" class="accent-primary size-4" />
            {{ t('quest.biweekly') }}
          </label>
        </template>
        <template v-else>
          <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('quest.pace') }}</p>
          <div class="mb-3 flex gap-2">
            <Button
              v-for="value in QUEST_PACES"
              :key="value"
              type="button"
              size="sm"
              class="w-auto flex-1"
              :variant="editor.pace === value ? 'default' : 'outline'"
              @click="editor.pace = value"
            >
              {{ t(`quest.paces.${value}`) }}
            </Button>
          </div>
          <div class="mb-4 flex flex-col gap-1">
            <Label for="boss-item-ends">{{ t('quest.endsOn') }}</Label>
            <Input id="boss-item-ends" v-model="editor.endsOn" type="date" />
          </div>
        </template>
        <p v-if="editorError" class="text-destructive mb-3 text-[12px]">{{ editorError }}</p>
        <div class="flex gap-2">
          <Button type="button" variant="outline" class="w-auto flex-1" @click="closeEditor">
            {{ t('quest.cancel') }}
          </Button>
          <Button type="button" class="w-auto flex-1" @click="saveEditor">
            {{ t('boss.saveItem') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
