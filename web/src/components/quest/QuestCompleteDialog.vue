<script setup lang="ts">
import { QUEST_NOTE_MAX_LENGTH } from '@nest-vue/shared';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { QuestListItem } from '@/lib/quests';

const props = defineProps<{
  item: QuestListItem;
  pending: boolean;
  error: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [note: string];
}>();

const { t } = useI18n();
const note = ref('');

const zeroReward = computed(
  () =>
    props.item.schedule === 'deadline' &&
    props.item.expectedGold === 0 &&
    props.item.expectedXp === 0,
);

function cancel(): void {
  if (props.pending) {
    return;
  }
  emit('cancel');
}

function confirm(): void {
  if (props.pending) {
    return;
  }
  emit('confirm', note.value.trim().slice(0, QUEST_NOTE_MAX_LENGTH));
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-foreground/40 absolute inset-0"
      :aria-label="t('quest.cancel')"
      @click="cancel"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 max-h-[80vh] w-full max-w-[440px] overflow-y-auto rounded-[18px] p-[22px] shadow-xl"
    >
      <h2 class="mb-2 text-[15px] font-bold">{{ t('quest.completeTitle') }}</h2>
      <p class="text-secondary-foreground mb-4 text-[12.5px] leading-normal">
        {{ t('quest.completeBody', { title: item.title }) }}
      </p>

      <template v-if="item.schedule === 'deadline'">
        <p
          v-if="item.expectedGold !== null && item.expectedXp !== null"
          class="mb-2 text-[13px] font-bold"
        >
          {{ t('quest.expectedReward', { xp: item.expectedXp, gold: item.expectedGold }) }}
        </p>
        <p class="text-secondary-foreground mb-3 text-[12.5px] leading-normal">
          {{ t('quest.deadlineRewardRule') }}
        </p>
        <p
          v-if="zeroReward"
          class="border-destructive text-destructive mb-4 rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-normal font-bold"
        >
          {{ t('quest.zeroRewardWarning') }}
        </p>
      </template>

      <div class="mb-4 flex flex-col gap-1">
        <Label for="quest-note">{{ t('quest.note') }}</Label>
        <textarea
          id="quest-note"
          v-model="note"
          :maxlength="QUEST_NOTE_MAX_LENGTH"
          rows="3"
          :disabled="pending"
          :placeholder="t('quest.notePlaceholder')"
          class="border-input bg-surface text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 w-full resize-none rounded-xl border px-3.5 py-3 text-[13px] shadow-none transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p class="text-secondary-foreground text-[12px] leading-normal">
          {{ t('quest.noteBonus') }}
        </p>
      </div>

      <p v-if="error" class="text-destructive mb-3 text-[12px]">{{ error }}</p>
      <div class="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="w-auto flex-1"
          :disabled="pending"
          @click="cancel"
        >
          {{ t('quest.cancel') }}
        </Button>
        <Button type="button" size="sm" class="w-auto flex-1" :disabled="pending" @click="confirm">
          {{ t('quest.confirmComplete') }}
        </Button>
      </div>
    </div>
  </div>
</template>
