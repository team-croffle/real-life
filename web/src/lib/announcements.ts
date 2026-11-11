import type { Announcement } from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export async function listAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('/announcements');
}
