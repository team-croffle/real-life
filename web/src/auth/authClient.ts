import { API_PREFIX } from '@nest-vue/shared';
import { createAuthClient } from 'better-auth/vue';

import { apiOrigin } from '@/lib/apiBase';

export const authClient = createAuthClient({
  baseURL: apiOrigin(),
  basePath: `/${API_PREFIX}/auth`,
});
