import { createRouter, createWebHistory } from 'vue-router';
import { handleHotUpdate, routes } from 'vue-router/auto-routes';

import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
});

type RouteAccess =
  | 'guest'
  | 'auth'
  | 'onboardingJob'
  | 'checkEmail'
  | 'onboardingComplete'
  | 'public';

function accessFor(path: string): RouteAccess {
  if (path === '/login' || path === '/register') {
    return 'guest';
  }

  if (path === '/onboarding/job') {
    return 'onboardingJob';
  }

  if (path === '/onboarding/complete') {
    return 'onboardingComplete';
  }

  if (path === '/register/check-email') {
    return 'checkEmail';
  }

  if (path === '/verify-email') {
    return 'public';
  }

  return 'auth';
}

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.hydrate();

  switch (accessFor(to.path)) {
    case 'guest':
      if (auth.needsJobOnboarding) {
        return { path: '/onboarding/job' };
      }
      return auth.isAuthenticated ? { path: '/' } : true;
    case 'onboardingJob':
      if (auth.needsJobOnboarding) {
        return true;
      }
      return auth.isAuthenticated ? { path: '/' } : { path: '/login' };
    case 'checkEmail':
      if (auth.needsJobOnboarding) {
        return { path: '/onboarding/job' };
      }
      if (auth.isAuthenticated) {
        return { path: '/' };
      }
      return auth.pendingEmail ? true : { path: '/register' };
    case 'onboardingComplete':
      if (!auth.isAuthenticated) {
        return { path: '/login' };
      }
      if (auth.needsJobOnboarding) {
        return { path: '/onboarding/job' };
      }
      return auth.justOnboarded ? true : { path: '/' };
    case 'public':
      return true;
    case 'auth':
      if (auth.needsJobOnboarding) {
        return { path: '/onboarding/job' };
      }
      return auth.isAuthenticated ? true : { path: '/login' };
  }
});

if (import.meta.hot) {
  handleHotUpdate(router);
}
