<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BrandPanel from '@/components/auth/BrandPanel.vue';
import LocaleSwitcher from '@/components/LocaleSwitcher.vue';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const props = withDefaults(
  defineProps<{
    wide?: boolean;
    showBack?: boolean;
    backTo?: string;
  }>(),
  { wide: false, showBack: false },
);

const emit = defineEmits<{
  back: [];
}>();

const { t } = useI18n();
const router = useRouter();

const canGoBack = computed(() => props.showBack || Boolean(props.backTo));

async function onBack(): Promise<void> {
  emit('back');
  if (props.backTo) {
    await router.push(props.backTo);
  }
}
</script>

<template>
  <div class="bg-auth-stage flex min-h-screen items-center justify-center p-4">
    <div
      class="bg-background text-foreground flex w-full max-w-[960px] overflow-hidden rounded-lg shadow-[0_20px_50px_rgb(0_0_0/15%)] md:h-[640px]"
    >
      <aside class="bg-stage hidden w-[360px] shrink-0 flex-col px-8 py-9 md:flex">
        <BrandPanel />
      </aside>
      <section class="flex-1 overflow-y-auto px-6 py-10 md:px-12 md:py-11">
        <div class="mb-6 flex items-center justify-end gap-2">
          <LocaleSwitcher />
          <Button
            v-if="canGoBack"
            type="button"
            variant="ghost"
            size="icon"
            class="text-secondary-foreground -mr-2"
            :aria-label="t('auth.back')"
            @click="onBack"
          >
            <ChevronLeft class="size-5" />
          </Button>
        </div>
        <div :class="cn('auth-screen-enter', props.wide ? 'max-w-[460px]' : 'max-w-[340px]')">
          <slot />
        </div>
      </section>
    </div>
  </div>
</template>
