<script setup lang="ts">
import { Megaphone } from '@lucide/vue';
import type { Announcement } from '@nest-vue/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { Button } from '@/components/ui/button';
import { sanitizeAnnouncementHtml } from '@/lib/announcementHtml';
import { formatAppDate } from '@/lib/appDateTime';

const props = defineProps<{
  notice: Announcement;
  showAllLink?: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const router = useRouter();

const bodyHtml = computed(() => sanitizeAnnouncementHtml(props.notice.body));

function goAll(): void {
  emit('close');
  void router.push('/notices');
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center px-4">
    <button
      type="button"
      class="bg-overlay absolute inset-0"
      :aria-label="t('notice.close')"
      @click="emit('close')"
    />
    <div
      role="dialog"
      aria-modal="true"
      class="bg-surface relative z-10 max-h-[640px] w-full max-w-[460px] overflow-y-auto rounded-[18px] p-6 shadow-xl"
    >
      <div class="text-primary mb-2.5 flex items-center gap-2">
        <Megaphone class="size-[15px] shrink-0" />
        <span class="text-[11.5px] font-bold">{{ t('notice.badge') }}</span>
        <span class="text-muted-foreground ml-auto text-[11.5px] tabular-nums">{{
          formatAppDate(notice.createdAt)
        }}</span>
      </div>
      <h2 class="mb-3 text-lg leading-snug font-bold">{{ notice.title }}</h2>
      <div class="notice-body border-border border-t pt-2" v-html="bodyHtml" />
      <div class="mt-5 flex items-center gap-2">
        <button
          v-if="showAllLink"
          type="button"
          class="text-primary px-1 py-2.5 text-[12.5px] font-bold"
          @click="goAll"
        >
          {{ t('notice.seeAll') }}
        </button>
        <Button
          type="button"
          variant="outline"
          class="ml-auto w-auto px-[22px]"
          @click="emit('close')"
        >
          {{ t('notice.close') }}
        </Button>
      </div>
    </div>
  </div>
</template>
