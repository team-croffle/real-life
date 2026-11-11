import type {
  AdminUserListItem,
  Announcement,
  CreateAnnouncementPayload,
  Paginated,
  RewardEvent,
  SuspendUserPayload,
  UpdateAnnouncementPayload,
  UpsertRewardEventPayload,
} from '@nest-vue/shared';

import { apiFetch } from '@/composables/useApi';

export async function listAdminUsers(
  page: number,
  q: string,
): Promise<Paginated<AdminUserListItem>> {
  const query = new URLSearchParams({ page: String(page) });
  const trimmed = q.trim();
  if (trimmed) {
    query.set('q', trimmed);
  }
  return apiFetch<Paginated<AdminUserListItem>>(`/admin/users?${query}`);
}

export async function suspendAdminUser(
  userId: string,
  payload: SuspendUserPayload,
): Promise<AdminUserListItem> {
  return apiFetch<AdminUserListItem>(`/admin/users/${userId}/suspend`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function unsuspendAdminUser(userId: string): Promise<AdminUserListItem> {
  return apiFetch<AdminUserListItem>(`/admin/users/${userId}/unsuspend`, { method: 'POST' });
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiFetch<void>(`/admin/users/${userId}`, { method: 'DELETE' });
}

export async function listAdminAnnouncements(): Promise<Announcement[]> {
  return apiFetch<Announcement[]>('/admin/announcements');
}

export async function createAdminAnnouncement(
  payload: CreateAnnouncementPayload,
): Promise<Announcement> {
  return apiFetch<Announcement>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAdminAnnouncement(
  announcementId: string,
  payload: UpdateAnnouncementPayload,
): Promise<Announcement> {
  return apiFetch<Announcement>(`/admin/announcements/${announcementId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminAnnouncement(announcementId: string): Promise<void> {
  await apiFetch<void>(`/admin/announcements/${announcementId}`, { method: 'DELETE' });
}

export async function getAdminRewardEvent(): Promise<RewardEvent | null> {
  const stored = await apiFetch<RewardEvent | undefined>('/admin/reward-events');
  return stored ?? null;
}

export async function upsertAdminRewardEvent(
  payload: UpsertRewardEventPayload,
): Promise<RewardEvent> {
  return apiFetch<RewardEvent>('/admin/reward-events', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function endAdminRewardEvent(): Promise<RewardEvent | null> {
  const ended = await apiFetch<RewardEvent | undefined>('/admin/reward-events/end', {
    method: 'POST',
  });
  return ended ?? null;
}
