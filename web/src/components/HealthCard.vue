<script setup lang="ts">
import type { HealthCheck } from '@nest-vue/shared';
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useApi } from '@/composables/useApi';

const { t } = useI18n();
const { data, error, pending, execute } = useApi<HealthCheck>('/health');

onMounted(execute);
</script>

<template>
  <section class="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
    <header class="mb-3 flex items-center justify-between">
      <h2 class="text-lg font-semibold">{{ t('health.heading') }}</h2>
      <button
        type="button"
        class="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        :disabled="pending"
        @click="execute"
      >
        {{ pending ? t('health.loading') : t('health.check') }}
      </button>
    </header>

    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ t('health.error') }}</p>

    <dl v-else-if="data" class="grid grid-cols-3 gap-3 text-sm">
      <div>
        <dt class="text-slate-500">{{ t('health.status') }}</dt>
        <dd class="font-mono">{{ data.status }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t('health.database') }}</dt>
        <dd class="font-mono">{{ data.database }}</dd>
      </div>
      <div>
        <dt class="text-slate-500">{{ t('health.uptime') }}</dt>
        <dd class="font-mono">{{ data.uptime }}s</dd>
      </div>
    </dl>
  </section>
</template>
