import { json, request } from '@/lib/api';

const CACHE_KEY = 'rhema_notifications_offline_v1';

function getAccountCacheKey(userId) {
  if (typeof window === 'undefined') return null;
  try {
    const user = JSON.parse(window.localStorage.getItem('rhema_user') || 'null');
    const id = String(userId ?? user?.id ?? user?.student_id ?? '').trim();
    const role = String(user?.role || '').trim().toLowerCase();
    return id && role ? `${CACHE_KEY}:${encodeURIComponent(role)}:${encodeURIComponent(id)}` : null;
  } catch (cause) {
    console.error('Offline notifications could not identify the signed-in account.', cause);
    return null;
  }
}

async function fetchWithOfflineCache(path, requestOptions = {}, userId) {
  try {
    const result = await request(path, {}, requestOptions);
    const key = getAccountCacheKey(userId);
    if (key) {
      try {
        window.localStorage.setItem(key, JSON.stringify(result));
      } catch (cause) {
        console.error('Notifications could not be saved for offline use.', cause);
      }
    }
    return result;
  } catch (cause) {
    const key = getAccountCacheKey(userId);
    const offline = cause instanceof Error && (cause.name === 'NetworkRequestError' || cause instanceof TypeError);
    if (!offline) throw cause;
    if (key) {
      try {
        const cached = window.localStorage.getItem(key);
        if (cached) return { ...JSON.parse(cached), offline: true };
      } catch (storageCause) {
        console.error('Saved notifications could not be read.', storageCause);
      }
    }
    throw new Error('You are offline and no saved notifications are available.');
  }
}

export function fetchUserNotifications(userId) {
  return fetchNotifications(userId);
}

export async function fetchNotifications(userId) {
  const data = await fetchWithOfflineCache('/notifications/getNotifications.php', {}, userId);
  if (Array.isArray(data?.data)) {
    data.data = data.data.map((notification) => ({
      ...notification,
      action_url: notification.action_url === '/admin/posts' ? '/admin/blog' : notification.action_url,
    }));
  }
  return data;
}

export async function fetchCommunicationNotifications() {
  const result = await fetchWithOfflineCache('/notifications/getNotifications.php');
  if (!Array.isArray(result?.data)) {
    throw new Error('The notifications API returned an invalid response.');
  }
  const notifications = result.data.map((notification) => ({
    ...notification,
    source: 'account',
    conversation_id: null,
    is_read: notification.is_read ?? (notification.read_at ? 1 : 0),
  }));
  return {
    notifications,
    unread: Number(result.unread) || notifications.filter((notification) => !notification.read_at).length,
    offline: Boolean(result.offline),
  };
}

export function fetchStudentNotifications() {
  return fetchWithOfflineCache('/students/getMyNotifications.php', { redirectOnUnauthorized: false });
}

export function markAccountNotificationRead(id) {
  return json('POST', '/notifications/markRead.php', { id }, { redirectOnUnauthorized: false });
}

export function markAllAccountNotificationsRead() {
  return json('POST', '/notifications/markRead.php', { all: true }, { redirectOnUnauthorized: false });
}

export function markStudentNotificationRead(id) {
  return json('POST', '/students/markMyNotificationRead.php', { id }, { redirectOnUnauthorized: false });
}

export function markAllStudentNotificationsRead() {
  return json('POST', '/students/markMyNotificationRead.php', { all: true }, { redirectOnUnauthorized: false });
}

export function saveNotification(data) {
  return json('POST', '/notifications/saveNotification.php', data);
}

export function deleteNotification(id) {
  return json('POST', '/notifications/deleteNotification.php', { id });
}
