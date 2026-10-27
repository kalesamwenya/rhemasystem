import { json, request } from '@/lib/api';
import {
  cacheCommunicationSnapshot,
  dispatchCommunicationsUpdated,
  getCachedCommunicationSnapshot,
  getQueuedNotificationActions,
  isNetworkFailure,
  queueNotificationAction,
  removeQueuedNotificationAction,
} from '@/lib/communication-offline-store';
import { syncPendingCommunicationMessages } from '@/lib/messages-api';

const requestOptions = { redirectOnUnauthorized: false };

export async function fetchChatSnapshot() {
  try {
    const result = await request('/communications/chat-notifications.php?action=bootstrap', {}, requestOptions);
    cacheCommunicationSnapshot(result);
    void syncQueuedChatNotificationActions();
    void syncPendingCommunicationMessages();
    return result;
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    const cached = getCachedCommunicationSnapshot();
    if (cached) return { ...cached, offline: true };
    throw new Error('You are offline and no saved chat or notification data is available.');
  }
}

function updateCachedNotification(id, source) {
  const cached = getCachedCommunicationSnapshot();
  if (!cached || !Array.isArray(cached.notifications)) return;
  const notifications = cached.notifications.map((notification) => {
    const item = notification;
    if (id !== null && (Number(item.id) !== id || (item.source || 'communications') !== source)) return item;
    return { ...item, read_at: item.read_at || new Date().toISOString() };
  });
  cacheCommunicationSnapshot({
    ...cached,
    notifications,
    unread_notifications: notifications.filter((notification) => !notification.read_at).length,
  });
}

export async function markChatNotificationRead(id, source = 'communications') {
  try {
    return await json('POST', '/communications/chat-notifications.php', { action: 'markNotificationRead', id, source }, requestOptions);
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    if (!queueNotificationAction({ kind: 'read', id, source })) {
      throw new Error('This notification could not be saved for offline synchronization.');
    }
    updateCachedNotification(id, source);
    dispatchCommunicationsUpdated();
    return { success: true, queued: true };
  }
}

export async function markAllChatNotificationsRead() {
  try {
    return await json('POST', '/communications/chat-notifications.php', { action: 'markAllNotificationsRead' }, requestOptions);
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    if (!queueNotificationAction({ kind: 'read-all' })) {
      throw new Error('Notification updates could not be saved for offline synchronization.');
    }
    updateCachedNotification(null, null);
    dispatchCommunicationsUpdated();
    return { success: true, queued: true };
  }
}

export async function syncQueuedChatNotificationActions() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  let updated = false;
  for (const action of getQueuedNotificationActions()) {
    try {
      if (action.kind === 'read') {
        await json('POST', '/communications/chat-notifications.php', {
          action: 'markNotificationRead',
          id: action.id,
          source: action.source,
        }, requestOptions);
      } else {
        await json('POST', '/communications/chat-notifications.php', { action: 'markAllNotificationsRead' }, requestOptions);
      }
      removeQueuedNotificationAction(action);
      updated = true;
    } catch (cause) {
      if (!isNetworkFailure(cause)) {
        console.error('A queued notification update could not be synchronized.', cause);
      }
      break;
    }
  }
  if (updated) dispatchCommunicationsUpdated();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncQueuedChatNotificationActions());
}
