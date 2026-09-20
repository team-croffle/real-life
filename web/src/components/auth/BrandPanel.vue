<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="flex h-full flex-col justify-between">
    <div class="flex items-center gap-2">
      <div class="bg-primary flex size-7 items-center justify-center rounded-[9px]">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7Z" />
        </svg>
      </div>
      <span class="text-sm font-bold">{{ t('brand.name') }}</span>
    </div>

    <div>
      <p class="mb-2.5 text-[22px] leading-[1.4] font-bold">
        {{ t('brand.headline1') }}<br />
        {{ t('brand.headline2') }}
      </p>
      <p class="text-secondary-foreground text-[12.5px] leading-[1.6]">
        {{ t('brand.sub') }}
      </p>
    </div>

    <p class="text-muted-foreground text-[11px]">{{ t('brand.footer') }}</p>
  </div>
</template>
