<script setup lang="ts">
import AuthLayout from '@/components/auth/AuthLayout.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';
</script>

<template>
  <AuthLayout back-to="/login">
    <RegisterForm />
  </AuthLayout>
</template>
