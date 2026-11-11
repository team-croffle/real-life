<script setup lang="ts">
import { ChevronLeft, ChevronRight, Search } from '@lucide/vue';
import {
  ANNOUNCEMENT_BODY_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  EVENT_MULTIPLIER_MAX,
  EVENT_MULTIPLIER_MIN,
  SUSPEND_REASON_MAX,
  eventMultiplierFromTenths,
  eventMultiplierToTenths,
} from '@nest-vue/shared';
import type { AdminUserListItem, Announcement, RewardEvent } from '@nest-vue/shared';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AnnouncementEditor from '@/components/admin/AnnouncementEditor.vue';
import AdminShell, { type AdminTab } from '@/components/layouts/AdminShell.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/composables/useApi';
import {
  createAdminAnnouncement,
  deleteAdminAnnouncement,
  deleteAdminUser,
  endAdminRewardEvent,
  getAdminRewardEvent,
  listAdminAnnouncements,
  listAdminUsers,
  suspendAdminUser,
  unsuspendAdminUser,
  updateAdminAnnouncement,
  upsertAdminRewardEvent,
} from '@/lib/admin';
import {
  formatAppDate,
  formatAppDateTime,
  fromAppDateTimeLocal,
  toAppDateTimeLocal,
} from '@/lib/appDateTime';
import { formatAmount } from '@/lib/formatAmount';

type SuspendPeriod = '1d' | '3d' | '7d' | '30d' | 'none';
type EventStatus = 'none' | 'scheduled' | 'active' | 'ended';
type ConfirmKind = 'user' | 'notice' | null;
type PanelView = 'loading' | 'ready' | 'error';

const PERIODS: SuspendPeriod[] = ['1d', '3d', '7d', '30d', 'none'];
const PERIOD_DAYS: Record<Exclude<SuspendPeriod, 'none'>, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
  '30d': 30,
};

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const tab = computed<AdminTab>(() => {
  const value = route.query.tab;
  if (value === 'announcements' || value === 'events') {
    return value;
  }
  return 'accounts';
});

function setTab(next: AdminTab): void {
  void router.replace({ path: '/admin', query: next === 'accounts' ? {} : { tab: next } });
}

const toast = ref('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(message: string): void {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = '';
  }, 1600);
}

function isAdminForbidden(cause: unknown): boolean {
  return cause instanceof ApiError && cause.status === 403;
}

function showFailedToast(cause: unknown, adminAccount = false): void {
  if (adminAccount && isAdminForbidden(cause)) {
    showToast(t('admin.toast.adminForbidden'));
    return;
  }
  showToast(t('admin.toast.failed'));
}

function htmlPreview(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function defaultEventLocals(): { start: string; end: string } {
  const now = new Date();
  const later = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return {
    start: toAppDateTimeLocal(now.toISOString()),
    end: toAppDateTimeLocal(later.toISOString()),
  };
}

function eventStatusOf(event: RewardEvent | null, now = new Date()): EventStatus {
  if (!event) {
    return 'none';
  }
  if (now.getTime() < new Date(event.startsAt).getTime()) {
    return 'scheduled';
  }
  if (now.getTime() < new Date(event.endsAt).getTime()) {
    return 'active';
  }
  return 'ended';
}

// accounts
const query = ref('');
const page = ref(1);
const users = ref<AdminUserListItem[]>([]);
const userTotal = ref(0);
const userTotalPages = ref(1);
const usersView = ref<PanelView>('loading');
let usersRequest = 0;

async function loadUsers(): Promise<void> {
  const request = ++usersRequest;
  usersView.value = users.value.length === 0 ? 'loading' : 'ready';
  try {
    const result = await listAdminUsers(page.value, query.value);
    if (request !== usersRequest) {
      return;
    }
    users.value = result.items;
    userTotal.value = result.total;
    userTotalPages.value = Math.max(1, result.totalPages);
    page.value = result.page;
    usersView.value = 'ready';
  } catch {
    if (request !== usersRequest) {
      return;
    }
    usersView.value = 'error';
  }
}

watch(query, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    page.value = 1;
    void loadUsers();
  }, 300);
});

function changePage(delta: number): void {
  const next = page.value + delta;
  if (next < 1 || next > userTotalPages.value) {
    return;
  }
  page.value = next;
  void loadUsers();
}

function userStatus(user: AdminUserListItem): string {
  if (!user.suspended) {
    return t('admin.accounts.active');
  }
  if (user.suspendedUntil) {
    return t('admin.accounts.suspendedUntil', { until: formatAppDateTime(user.suspendedUntil) });
  }
  return t('admin.accounts.suspendedOpen');
}

const suspendUser = ref<AdminUserListItem | null>(null);
const suspendPeriod = ref<SuspendPeriod>('7d');
const suspendReason = ref('');

const suspendUntilIso = computed(() => {
  if (suspendPeriod.value === 'none') {
    return null;
  }
  return new Date(
    Date.now() + PERIOD_DAYS[suspendPeriod.value] * 24 * 60 * 60 * 1000,
  ).toISOString();
});

function openSuspend(user: AdminUserListItem): void {
  suspendUser.value = user;
  suspendPeriod.value = '7d';
  suspendReason.value = '';
}

async function confirmSuspend(): Promise<void> {
  const target = suspendUser.value;
  if (!target) {
    return;
  }
  try {
    const updated = await suspendAdminUser(target.id, {
      until: suspendUntilIso.value,
      reason: suspendReason.value.trim() || null,
    });
    users.value = users.value.map((row) => (row.id === updated.id ? updated : row));
    showToast(t('admin.toast.suspended', { name: target.nickname }));
    suspendUser.value = null;
  } catch (cause) {
    showFailedToast(cause, true);
  }
}

async function unsuspend(user: AdminUserListItem): Promise<void> {
  try {
    const updated = await unsuspendAdminUser(user.id);
    users.value = users.value.map((row) => (row.id === updated.id ? updated : row));
    showToast(t('admin.toast.unsuspended', { name: user.nickname }));
  } catch (cause) {
    showFailedToast(cause, true);
  }
}

const confirmKind = ref<ConfirmKind>(null);
const confirmUser = ref<AdminUserListItem | null>(null);
const confirmNotice = ref<Announcement | null>(null);

function askDeleteUser(user: AdminUserListItem): void {
  confirmKind.value = 'user';
  confirmUser.value = user;
}

async function confirmDelete(): Promise<void> {
  if (confirmKind.value === 'user' && confirmUser.value) {
    const target = confirmUser.value;
    try {
      await deleteAdminUser(target.id);
      showToast(t('admin.toast.userDeleted', { name: target.nickname }));
      confirmKind.value = null;
      confirmUser.value = null;
      await loadUsers();
    } catch (cause) {
      showFailedToast(cause, true);
    }
    return;
  }
  if (confirmKind.value === 'notice' && confirmNotice.value) {
    const target = confirmNotice.value;
    try {
      await deleteAdminAnnouncement(target.id);
      notices.value = notices.value.filter((row) => row.id !== target.id);
      showToast(t('admin.toast.noticeDeleted'));
      confirmKind.value = null;
      confirmNotice.value = null;
    } catch (cause) {
      showFailedToast(cause);
    }
  }
}

// notices
const notices = ref<Announcement[]>([]);
const noticesView = ref<PanelView>('loading');
const noticeFormShow = ref(false);
const noticeEditId = ref<string | null>(null);
const noticeTitle = ref('');
const noticeBody = ref('');
const noticeEmpty = ref(true);

async function loadNotices(): Promise<void> {
  noticesView.value = notices.value.length === 0 ? 'loading' : 'ready';
  try {
    notices.value = await listAdminAnnouncements();
    noticesView.value = 'ready';
  } catch {
    noticesView.value = 'error';
  }
}

function openNoticeCreate(): void {
  noticeFormShow.value = true;
  noticeEditId.value = null;
  noticeTitle.value = '';
  noticeBody.value = '';
  noticeEmpty.value = true;
}

function openNoticeEdit(item: Announcement): void {
  noticeFormShow.value = true;
  noticeEditId.value = item.id;
  noticeTitle.value = item.title;
  noticeBody.value = item.body;
  noticeEmpty.value = false;
}

const noticeReady = computed(
  () =>
    noticeTitle.value.trim().length > 0 &&
    !noticeEmpty.value &&
    noticeBody.value.length <= ANNOUNCEMENT_BODY_MAX,
);

async function saveNotice(): Promise<void> {
  if (!noticeReady.value) {
    return;
  }
  const title = noticeTitle.value.trim();
  const body = noticeBody.value;
  try {
    if (noticeEditId.value) {
      const updated = await updateAdminAnnouncement(noticeEditId.value, { title, body });
      notices.value = notices.value.map((row) => (row.id === updated.id ? updated : row));
      showToast(t('admin.toast.noticeUpdated'));
    } else {
      const created = await createAdminAnnouncement({ title, body });
      notices.value = [created, ...notices.value];
      showToast(t('admin.toast.noticeCreated'));
    }
    noticeFormShow.value = false;
    noticeEditId.value = null;
  } catch (cause) {
    showFailedToast(cause);
  }
}

function askDeleteNotice(item: Announcement): void {
  confirmKind.value = 'notice';
  confirmNotice.value = item;
}

function noticeDateLabel(item: Announcement): string {
  const created = formatAppDate(item.createdAt);
  if (item.updatedAt !== item.createdAt) {
    return t('admin.notice.updated', { created, updated: formatAppDate(item.updatedAt) });
  }
  return t('admin.notice.created', { date: created });
}

// events
const storedEvent = ref<RewardEvent | null>(null);
const eventsView = ref<PanelView>('loading');
const formMult = ref(EVENT_MULTIPLIER_MIN);
const formStart = ref('');
const formEnd = ref('');

const currentEventStatus = computed(() => eventStatusOf(storedEvent.value));
const rangeError = computed(() => formEnd.value !== '' && !(formEnd.value > formStart.value));

async function loadEvent(): Promise<void> {
  eventsView.value = 'loading';
  try {
    const stored = await getAdminRewardEvent();
    storedEvent.value = stored;
    if (stored) {
      formMult.value = stored.multiplier;
      formStart.value = toAppDateTimeLocal(stored.startsAt);
      formEnd.value = toAppDateTimeLocal(stored.endsAt);
    } else {
      formMult.value = 2;
      const range = defaultEventLocals();
      formStart.value = range.start;
      formEnd.value = range.end;
    }
    eventsView.value = 'ready';
  } catch {
    eventsView.value = 'error';
  }
}

function adjustMult(delta: number): void {
  const tenths = eventMultiplierToTenths(formMult.value) + delta;
  const next = eventMultiplierFromTenths(tenths);
  if (next < EVENT_MULTIPLIER_MIN || next > EVENT_MULTIPLIER_MAX) {
    return;
  }
  formMult.value = next;
}

async function saveEvent(): Promise<void> {
  if (rangeError.value) {
    return;
  }
  try {
    storedEvent.value = await upsertAdminRewardEvent({
      multiplier: formMult.value,
      startsAt: fromAppDateTimeLocal(formStart.value),
      endsAt: fromAppDateTimeLocal(formEnd.value),
    });
    showToast(t('admin.toast.eventSaved'));
  } catch (cause) {
    showFailedToast(cause);
  }
}

async function endEvent(): Promise<void> {
  const status = currentEventStatus.value;
  try {
    const ended = await endAdminRewardEvent();
    storedEvent.value = ended;
    if (ended) {
      formEnd.value = toAppDateTimeLocal(ended.endsAt);
    } else {
      const range = defaultEventLocals();
      formStart.value = range.start;
      formEnd.value = range.end;
    }
    showToast(
      status === 'scheduled' ? t('admin.toast.eventCancelled') : t('admin.toast.eventEnded'),
    );
  } catch (cause) {
    showFailedToast(cause);
  }
}

watch(tab, (next) => {
  if (next === 'accounts') {
    void loadUsers();
  } else if (next === 'announcements') {
    void loadNotices();
  } else {
    void loadEvent();
  }
});

onMounted(() => {
  if (tab.value === 'accounts') {
    void loadUsers();
  } else if (tab.value === 'announcements') {
    void loadNotices();
  } else {
    void loadEvent();
  }
});

onUnmounted(() => {
  clearTimeout(toastTimer);
  clearTimeout(searchTimer);
});
</script>

<template>
  <AdminShell :tab="tab" @update:tab="setTab">
    <section v-if="tab === 'accounts'" class="auth-screen-enter">
      <h1 class="mb-1 text-[22px] font-bold">{{ t('admin.accounts.title') }}</h1>
      <p class="text-muted-foreground mb-[22px] text-[12.5px]">
        {{
          query.trim()
            ? t('admin.accounts.countSearch', { count: formatAmount(userTotal) })
            : t('admin.accounts.countAll', { count: formatAmount(userTotal) })
        }}
      </p>

      <div
        class="bg-surface border-border mb-[18px] flex w-full max-w-[320px] items-center gap-1.5 rounded-xl border px-3.5 py-2.5"
      >
        <Search class="text-muted-foreground size-3.5 shrink-0" />
        <input
          v-model="query"
          type="text"
          maxlength="200"
          class="text-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
          :placeholder="t('admin.accounts.search')"
        />
      </div>

      <p v-if="usersView === 'loading'" class="text-muted-foreground text-[12.5px]">
        {{ t('admin.loading') }}
      </p>
      <div v-else-if="usersView === 'error'" class="flex items-center gap-2">
        <p class="text-muted-foreground text-[12.5px]">{{ t('admin.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto" @click="loadUsers">
          {{ t('admin.retry') }}
        </Button>
      </div>
      <div v-else class="bg-surface border-border overflow-x-auto rounded-2xl border">
        <div class="min-w-[720px]">
          <div
            class="bg-muted text-muted-foreground grid grid-cols-[2.2fr_0.7fr_1fr_1.6fr_150px] gap-2.5 px-[18px] py-3 text-[11px] font-bold"
          >
            <span>{{ t('admin.accounts.nickname') }}</span>
            <span>{{ t('admin.accounts.level') }}</span>
            <span>{{ t('admin.accounts.joined') }}</span>
            <span>{{ t('admin.accounts.status') }}</span>
            <span class="text-right">{{ t('admin.accounts.actions') }}</span>
          </div>
          <div
            v-for="user in users"
            :key="user.id"
            class="border-border grid grid-cols-[2.2fr_0.7fr_1fr_1.6fr_150px] items-center gap-2.5 border-t px-[18px] py-3.5"
          >
            <div class="min-w-0">
              <p class="text-[13px] font-semibold">
                {{ user.nickname
                }}<span class="text-muted-foreground font-medium">#{{ user.tag }}</span>
              </p>
              <p class="text-muted-foreground truncate text-[11px]">{{ user.email }}</p>
            </div>
            <span class="text-[12.5px] tabular-nums">Lv.{{ user.level }}</span>
            <span class="text-muted-foreground text-[12.5px] tabular-nums">{{
              formatAppDate(user.createdAt)
            }}</span>
            <div class="min-w-0">
              <span
                class="inline-block rounded-full px-2.5 py-1 text-[11px] font-bold"
                :class="
                  user.suspended
                    ? 'bg-destructive/15 text-destructive'
                    : 'bg-accent text-accent-foreground'
                "
              >
                {{ userStatus(user) }}
              </span>
              <p
                v-if="user.suspended && user.suspendReason"
                class="text-muted-foreground mt-1 truncate text-[11px]"
              >
                {{ t('admin.accounts.reason', { reason: user.suspendReason }) }}
              </p>
            </div>
            <div class="flex justify-end gap-1.5">
              <button
                v-if="user.suspended"
                type="button"
                class="border-primary text-primary rounded-full border px-3 py-1.5 text-[11.5px] font-bold"
                @click="unsuspend(user)"
              >
                {{ t('admin.accounts.unsuspend') }}
              </button>
              <button
                v-else
                type="button"
                class="border-border text-secondary-foreground rounded-full border px-3 py-1.5 text-[11.5px] font-bold"
                @click="openSuspend(user)"
              >
                {{ t('admin.accounts.suspend') }}
              </button>
              <button
                type="button"
                class="border-destructive/30 text-destructive rounded-full border px-3 py-1.5 text-[11.5px] font-bold"
                @click="askDeleteUser(user)"
              >
                {{ t('admin.delete') }}
              </button>
            </div>
          </div>
          <p
            v-if="users.length === 0"
            class="border-border text-muted-foreground border-t px-[18px] py-9 text-center text-[12.5px]"
          >
            {{ t('admin.accounts.empty') }}
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-center gap-1.5">
        <button
          type="button"
          class="border-border bg-surface size-[30px] rounded-lg border text-[13px] font-bold"
          :class="page > 1 ? 'text-foreground' : 'text-muted-foreground'"
          :disabled="page <= 1"
          @click="changePage(-1)"
        >
          <ChevronLeft class="mx-auto size-4" />
        </button>
        <span class="px-2 text-[12.5px] font-bold tabular-nums">{{
          t('admin.accounts.page', { page, total: userTotalPages })
        }}</span>
        <button
          type="button"
          class="border-border bg-surface size-[30px] rounded-lg border text-[13px] font-bold"
          :class="page < userTotalPages ? 'text-foreground' : 'text-muted-foreground'"
          :disabled="page >= userTotalPages"
          @click="changePage(1)"
        >
          <ChevronRight class="mx-auto size-4" />
        </button>
      </div>
    </section>

    <section v-else-if="tab === 'announcements'" class="auth-screen-enter">
      <div class="mb-[22px] flex items-center justify-between">
        <div>
          <h1 class="mb-1 text-[22px] font-bold">{{ t('admin.notice.title') }}</h1>
          <p class="text-muted-foreground text-[12.5px]">
            {{ t('admin.notice.count', { count: formatAmount(notices.length) }) }}
          </p>
        </div>
        <Button type="button" class="w-auto px-[18px]" @click="openNoticeCreate">
          {{ t('admin.notice.create') }}
        </Button>
      </div>

      <div
        v-if="noticeFormShow"
        class="border-primary bg-surface mb-[18px] max-w-[760px] rounded-2xl border-[1.5px] p-[18px]"
      >
        <p class="mb-3.5 text-[13.5px] font-bold">
          {{ noticeEditId ? t('admin.notice.formEdit') : t('admin.notice.formCreate') }}
        </p>
        <div class="text-muted-foreground mb-1.5 flex justify-between text-[11.5px]">
          <span>{{ t('admin.notice.titleLabel') }}</span>
          <span class="tabular-nums">{{ noticeTitle.length }} / {{ ANNOUNCEMENT_TITLE_MAX }}</span>
        </div>
        <Input
          v-model="noticeTitle"
          :maxlength="ANNOUNCEMENT_TITLE_MAX"
          :placeholder="t('admin.notice.titlePlaceholder')"
          class="mb-3.5"
        />
        <div class="text-muted-foreground mb-1.5 flex justify-between text-[11.5px]">
          <span>{{ t('admin.notice.bodyLabel') }}</span>
          <span class="tabular-nums"
            >{{ formatAmount(noticeBody.length) }} / {{ formatAmount(ANNOUNCEMENT_BODY_MAX) }}</span
          >
        </div>
        <AnnouncementEditor v-model="noticeBody" @empty="noticeEmpty = $event" />
        <div class="mt-3.5 flex gap-2">
          <Button type="button" variant="outline" class="flex-1" @click="noticeFormShow = false">
            {{ t('admin.cancel') }}
          </Button>
          <Button type="button" class="flex-1" :disabled="!noticeReady" @click="saveNotice">
            {{ noticeEditId ? t('admin.notice.save') : t('admin.notice.publish') }}
          </Button>
        </div>
      </div>

      <div v-if="noticesView === 'error'" class="flex items-center gap-2">
        <p class="text-muted-foreground text-[12.5px]">{{ t('admin.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto" @click="loadNotices">
          {{ t('admin.retry') }}
        </Button>
      </div>
      <div v-else class="flex max-w-[760px] flex-col gap-2.5">
        <div
          v-for="item in notices"
          :key="item.id"
          class="bg-surface border-border flex items-start gap-3.5 rounded-2xl border px-[18px] py-4"
        >
          <div class="min-w-0 flex-1">
            <p class="mb-1 text-[13.5px] font-bold">{{ item.title }}</p>
            <p class="text-secondary-foreground mb-1.5 line-clamp-2 text-xs leading-normal">
              {{ htmlPreview(item.body) }}
            </p>
            <p class="text-muted-foreground text-[11px] tabular-nums">
              {{ noticeDateLabel(item) }}
            </p>
          </div>
          <div class="flex shrink-0 gap-1.5">
            <button
              type="button"
              class="border-border text-secondary-foreground rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold"
              @click="openNoticeEdit(item)"
            >
              {{ t('admin.notice.edit') }}
            </button>
            <button
              type="button"
              class="border-destructive/30 text-destructive rounded-full border px-3.5 py-1.5 text-[11.5px] font-bold"
              @click="askDeleteNotice(item)"
            >
              {{ t('admin.delete') }}
            </button>
          </div>
        </div>
        <p
          v-if="noticesView === 'ready' && notices.length === 0"
          class="border-border text-muted-foreground rounded-2xl border border-dashed px-[18px] py-9 text-center text-[12.5px]"
        >
          {{ t('admin.notice.empty') }}
        </p>
      </div>
    </section>

    <section v-else class="auth-screen-enter">
      <h1 class="mb-1 text-[22px] font-bold">{{ t('admin.event.title') }}</h1>
      <p class="text-muted-foreground mb-[22px] max-w-[560px] text-[12.5px] leading-relaxed">
        {{ t('admin.event.subtitle') }}
      </p>

      <div v-if="eventsView === 'error'" class="mb-4 flex items-center gap-2">
        <p class="text-muted-foreground text-[12.5px]">{{ t('admin.loadError') }}</p>
        <Button type="button" variant="outline" size="sm" class="w-auto" @click="loadEvent">
          {{ t('admin.retry') }}
        </Button>
      </div>

      <div
        class="bg-surface border-border mb-4 flex max-w-[560px] items-center gap-3.5 rounded-[18px] border px-[22px] py-[18px]"
      >
        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          :class="{
            'bg-muted text-muted-foreground':
              currentEventStatus === 'none' || currentEventStatus === 'ended',
            'bg-gold-soft text-gold': currentEventStatus === 'scheduled',
            'bg-accent text-accent-foreground': currentEventStatus === 'active',
          }"
        >
          {{ t(`admin.event.${currentEventStatus}`) }}
        </span>
        <div class="min-w-0 flex-1">
          <template v-if="storedEvent">
            <p class="text-gold text-[15px] font-bold tabular-nums">
              ×{{ storedEvent.multiplier.toFixed(1) }}
            </p>
            <p class="text-muted-foreground mt-0.5 text-[11.5px] tabular-nums">
              {{
                t('admin.event.period', {
                  start: formatAppDateTime(storedEvent.startsAt),
                  end: formatAppDateTime(storedEvent.endsAt),
                })
              }}
            </p>
          </template>
          <p v-else class="text-muted-foreground text-[12.5px]">{{ t('admin.event.empty') }}</p>
        </div>
        <button
          v-if="currentEventStatus === 'active' || currentEventStatus === 'scheduled'"
          type="button"
          class="border-destructive/30 text-destructive shrink-0 rounded-full border px-3.5 py-2 text-[11.5px] font-bold"
          @click="endEvent"
        >
          {{
            currentEventStatus === 'scheduled'
              ? t('admin.event.cancelEvent')
              : t('admin.event.endNow')
          }}
        </button>
      </div>

      <div
        class="bg-surface border-border flex max-w-[560px] flex-col gap-[22px] rounded-[18px] border p-6"
      >
        <div>
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[13px] font-bold">{{ t('admin.event.multiplier') }}</span>
            <span class="text-gold text-[15px] font-bold tabular-nums"
              >×{{ formMult.toFixed(1) }}</span
            >
          </div>
          <div class="bg-muted h-2 overflow-hidden rounded-full">
            <div
              class="bg-gold h-full"
              :style="{
                width: `${Math.round(((formMult - EVENT_MULTIPLIER_MIN) / (EVENT_MULTIPLIER_MAX - EVENT_MULTIPLIER_MIN)) * 100)}%`,
              }"
            />
          </div>
          <div class="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              class="border-border h-[30px] w-[34px] rounded-lg border text-[15px]"
              :class="formMult > EVENT_MULTIPLIER_MIN ? 'text-secondary-foreground' : 'text-border'"
              :disabled="formMult <= EVENT_MULTIPLIER_MIN"
              @click="adjustMult(-1)"
            >
              −
            </button>
            <button
              type="button"
              class="border-border h-[30px] w-[34px] rounded-lg border text-[15px]"
              :class="formMult < EVENT_MULTIPLIER_MAX ? 'text-secondary-foreground' : 'text-border'"
              :disabled="formMult >= EVENT_MULTIPLIER_MAX"
              @click="adjustMult(1)"
            >
              +
            </button>
            <span class="text-muted-foreground ml-1 text-[11px]">{{
              t('admin.event.stepHint')
            }}</span>
          </div>
        </div>

        <div class="flex gap-3">
          <div class="flex-1">
            <p class="text-muted-foreground mb-1.5 text-[11.5px]">{{ t('admin.event.start') }}</p>
            <input
              v-model="formStart"
              type="datetime-local"
              class="bg-muted text-foreground w-full rounded-[10px] border px-3 py-2 text-[12.5px]"
              :class="rangeError ? 'border-destructive' : 'border-border'"
            />
          </div>
          <div class="flex-1">
            <p class="text-muted-foreground mb-1.5 text-[11.5px]">{{ t('admin.event.end') }}</p>
            <input
              v-model="formEnd"
              type="datetime-local"
              class="bg-muted text-foreground w-full rounded-[10px] border px-3 py-2 text-[12.5px]"
              :class="rangeError ? 'border-destructive' : 'border-border'"
            />
          </div>
        </div>
        <p v-if="rangeError" class="text-destructive -mt-3 text-[11.5px]">
          {{ t('admin.event.rangeError') }}
        </p>
        <div>
          <Button type="button" :disabled="rangeError" @click="saveEvent">
            {{ storedEvent ? t('admin.event.save') : t('admin.event.create') }}
          </Button>
          <p v-if="storedEvent" class="text-muted-foreground mt-2 text-center text-[11px]">
            {{ t('admin.event.replaceNote') }}
          </p>
        </div>
      </div>
    </section>

    <div
      v-if="suspendUser"
      class="bg-overlay fixed inset-0 z-20 flex items-center justify-center px-4"
    >
      <div role="dialog" class="bg-surface auth-screen-enter w-[420px] rounded-[20px] p-6">
        <p class="mb-1 text-base font-bold">
          {{ t('admin.accounts.suspendTitle', { name: suspendUser.nickname }) }}
        </p>
        <p class="text-muted-foreground mb-[18px] text-xs">{{ t('admin.accounts.suspendBody') }}</p>
        <p class="text-muted-foreground mb-2 text-[11.5px]">{{ t('admin.accounts.period') }}</p>
        <div class="mb-2 flex gap-1.5">
          <button
            v-for="period in PERIODS"
            :key="period"
            type="button"
            class="h-8 flex-1 rounded-full border text-xs font-bold"
            :class="
              suspendPeriod === period
                ? 'border-destructive bg-destructive text-white'
                : 'border-border text-secondary-foreground'
            "
            @click="suspendPeriod = period"
          >
            {{ t(`admin.accounts.period${period === 'none' ? 'None' : period}`) }}
          </button>
        </div>
        <p class="text-secondary-foreground mb-4 text-[11.5px] tabular-nums">
          {{
            suspendUntilIso
              ? t('admin.accounts.untilLabel', { until: formatAppDateTime(suspendUntilIso) })
              : t('admin.accounts.untilOpen')
          }}
        </p>
        <div class="text-muted-foreground mb-1.5 flex justify-between text-[11.5px]">
          <span>{{ t('admin.accounts.reasonOptional') }}</span>
          <span class="tabular-nums">{{ suspendReason.length }} / {{ SUSPEND_REASON_MAX }}</span>
        </div>
        <textarea
          v-model="suspendReason"
          :maxlength="SUSPEND_REASON_MAX"
          :placeholder="t('admin.accounts.reasonPlaceholder')"
          class="bg-muted border-border text-foreground mb-[18px] min-h-[72px] w-full resize-none rounded-[10px] border px-3 py-2.5 text-[12.5px] leading-normal"
        />
        <div class="flex gap-2">
          <Button type="button" variant="outline" class="flex-1" @click="suspendUser = null">
            {{ t('admin.cancel') }}
          </Button>
          <Button
            type="button"
            class="bg-destructive hover:bg-destructive/90 flex-1"
            @click="confirmSuspend"
          >
            {{ t('admin.accounts.confirmSuspend') }}
          </Button>
        </div>
      </div>
    </div>

    <div
      v-if="confirmKind"
      class="bg-overlay fixed inset-0 z-20 flex items-center justify-center px-4"
    >
      <div role="dialog" class="bg-surface auth-screen-enter w-[380px] rounded-[20px] p-6">
        <p class="mb-2 text-base font-bold">
          {{
            confirmKind === 'user' && confirmUser
              ? t('admin.accounts.deleteTitle', { name: confirmUser.nickname })
              : t('admin.notice.deleteTitle')
          }}
        </p>
        <p class="text-secondary-foreground mb-5 text-[12.5px] leading-normal">
          {{
            confirmKind === 'user'
              ? t('admin.accounts.deleteBody')
              : t('admin.notice.deleteBody', { title: confirmNotice?.title ?? '' })
          }}
        </p>
        <div class="flex gap-2">
          <Button type="button" variant="outline" class="flex-1" @click="confirmKind = null">
            {{ t('admin.cancel') }}
          </Button>
          <Button
            type="button"
            class="bg-destructive hover:bg-destructive/90 flex-1"
            @click="confirmDelete"
          >
            {{ t('admin.delete') }}
          </Button>
        </div>
      </div>
    </div>

    <p
      v-if="toast"
      class="bg-foreground text-background fixed bottom-9 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-2.5 text-[12.5px] font-semibold"
    >
      {{ toast }}
    </p>
  </AdminShell>
</template>
