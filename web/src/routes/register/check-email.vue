<script setup lang="ts">
import AuthLayout from '@/components/auth/AuthLayout.vue';
import CheckEmailPanel from '@/components/auth/CheckEmailPanel.vue';
</script>

<template>
  <AuthLayout back-to="/login">
    <CheckEmailPanel />
  </AuthLayout>
</template>
