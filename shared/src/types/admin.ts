export interface AdminUserListItem {
  id: string;
  email: string;
  nickname: string;
  tag: string;
  createdAt: string;
  level: number;
  suspendedUntil: string | null;
  suspendReason: string | null;
}

export interface SuspendUserPayload {
  until?: string | null;
  reason?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  body: string;
}

export interface UpdateAnnouncementPayload {
  title?: string;
  body?: string;
}

export interface RewardEvent {
  id: string;
  multiplier: number;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentRewardEvent {
  multiplier: number;
  endsAt: string;
}

export interface UpsertRewardEventPayload {
  multiplier: number;
  startsAt: string;
  endsAt: string;
}
