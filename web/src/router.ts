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

router.beforeEach(async (to, from) => {
  if (to.path === '/register') {
    to.meta.fromPath = from.path;
  }

  const auth = useAuthStore();
  await auth.hydrate();

  switch (accessFor(to.path)) {
    case 'guest':
      return auth.isAuthenticated ? { path: '/' } : true;
    case 'onboardingJob':
      if (auth.isAuthenticated) {
        return { path: '/' };
      }
      return auth.hasJobAccess ? true : { path: '/register' };
    case 'checkEmail':
      if (auth.isAuthenticated) {
        return { path: '/' };
      }
      return auth.pendingEmail ? true : { path: '/register' };
    case 'onboardingComplete':
      if (!auth.isAuthenticated) {
        return { path: '/login' };
      }
      return auth.justOnboarded ? true : { path: '/' };
    case 'public':
      return true;
    case 'auth':
      return auth.isAuthenticated || auth.hasTokens ? true : { path: '/login' };
  }
});

if (import.meta.hot) {
  handleHotUpdate(router);
}
