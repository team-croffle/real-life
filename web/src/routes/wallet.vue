<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import AppShell from '@/components/layouts/AppShell.vue';
import PlaceholderPage from '@/components/layouts/PlaceholderPage.vue';

const { t } = useI18n();
</script>

<template>
  <AppShell>
    <PlaceholderPage :title="t('nav.wallet')" />
  </AppShell>
</template>
