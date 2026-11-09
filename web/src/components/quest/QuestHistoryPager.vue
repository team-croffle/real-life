<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  page: number;
  totalPages: number;
  size: number;
}>();

const emit = defineEmits<{
  page: [page: number];
  size: [size: number];
}>();

const { t } = useI18n();
const sizes = [5, 10, 15, 20];

const numbers = computed(() => {
  const total = props.totalPages;
  const width = 5;
  if (total <= width) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  let start = props.page - 2;
  if (start < 1) {
    start = 1;
  }
  if (start + width - 1 > total) {
    start = total - width + 1;
  }
  return Array.from({ length: width }, (_, index) => start + index);
});
</script>

<template>
  <div class="mt-4 flex flex-wrap items-center gap-3">
    <div v-if="totalPages > 1" class="flex items-center gap-1">
      <button
        type="button"
        class="text-secondary-foreground size-8 text-[16px] disabled:opacity-40"
        :disabled="page <= 1"
        @click="emit('page', page - 1)"
      >
        ‹
      </button>
      <button
        v-for="number in numbers"
        :key="number"
        type="button"
        class="size-8 rounded-full text-[13px] font-bold"
        :class="
          number === page ? 'bg-primary text-primary-foreground' : 'text-secondary-foreground'
        "
        @click="emit('page', number)"
      >
        {{ number }}
      </button>
      <button
        type="button"
        class="text-secondary-foreground size-8 text-[16px] disabled:opacity-40"
        :disabled="page >= totalPages"
        @click="emit('page', page + 1)"
      >
        ›
      </button>
    </div>
    <div class="ml-auto flex items-center gap-1.5">
      <span class="text-muted-foreground mr-1 text-[12px]">{{ t('quest.pageSize') }}</span>
      <button
        v-for="value in sizes"
        :key="value"
        type="button"
        class="rounded-full px-2.5 py-1 text-[12px] font-bold"
        :class="value === size ? 'bg-surface text-foreground' : 'text-secondary-foreground'"
        @click="emit('size', value)"
      >
        {{ t('quest.pageSizeCount', { n: value }) }}
      </button>
    </div>
  </div>
</template>
