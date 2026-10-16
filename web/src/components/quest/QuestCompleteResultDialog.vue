<script setup lang="ts">
import type { QuestCompletionResult } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Button } from '@/components/ui/button';

const props = defineProps<{
  result: QuestCompletionResult;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const leveledUp = computed(() => props.result.ticketsGranted > 0);
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-foreground/40 absolute inset-0"
      :aria-label="t('quest.close')"
      @click="emit('close')"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 w-full max-w-[340px] rounded-[18px] p-[22px] shadow-xl"
    >
      <h2 class="mb-4 text-[15px] font-bold">{{ t('quest.resultTitle') }}</h2>
      <div class="mb-4 flex flex-col gap-1">
        <p class="text-[13px] font-bold">
          {{ t('quest.resultGold', { gold: result.gold }) }}
        </p>
        <p class="text-[13px] font-bold">
          {{ t('quest.resultXp', { xp: result.xp }) }}
        </p>
        <p v-if="leveledUp" class="text-[13px] font-bold">
          {{ t('quest.resultLevel', { level: result.level }) }}
        </p>
        <p v-if="leveledUp" class="text-[13px] font-bold">
          {{ t('quest.resultTickets', { count: result.ticketsGranted }) }}
        </p>
        <p v-for="mark in result.titlesGranted" :key="mark" class="text-[13px] font-bold">
          {{ t('home.titleReached', { mark }) }}
        </p>
      </div>
      <Button type="button" size="sm" class="w-full" @click="emit('close')">
        {{ t('quest.close') }}
      </Button>
    </div>
  </div>
</template>
