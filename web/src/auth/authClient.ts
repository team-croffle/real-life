import { createAuthClient } from 'better-auth/vue';

import { apiOrigin } from '@/lib/apiBase';

export const authClient = createAuthClient({
  baseURL: apiOrigin(),
});
