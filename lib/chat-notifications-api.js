import { json, request } from '@/lib/api';
import {
  fetchCommunicationNotifications,
  markAccountNotificationRead,
  markAllAccountNotificationsRead,
} from '@/lib/notifications-api';
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
    const result = await request('/communications/chat-notifications.php', {}, requestOptions);
    let accountNotifications = { notifications: [], unread: 0 };
    let notificationsError = '';
    try {
      accountNotifications = await fetchCommunicationNotifications();
    } catch (cause) {
      notificationsError = cause instanceof Error ? cause.message : 'Account notifications could not be loaded.';
      console.error('Account notifications could not be loaded with the chat snapshot.', cause);
    }
    const snapshot = {
      ...result,
      notifications: [
        ...(Array.isArray(result.notifications) ? result.notifications : []),
        ...accountNotifications.notifications,
      ],
      unread_notifications: (Number(result.unread_notifications) || 0) + (Number(accountNotifications.unread) || 0),
      notifications_error: notificationsError,
    };
    cacheCommunicationSnapshot(snapshot);
    void syncQueuedChatNotificationActions();
    void syncPendingCommunicationMessages();
    return snapshot;
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
    if (source === 'account') return await markAccountNotificationRead(id);
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
    const [chatResult, accountResult] = await Promise.all([
      json('POST', '/communications/chat-notifications.php', { action: 'markAllNotificationsRead' }, requestOptions),
      markAllAccountNotificationsRead(),
    ]);
    return { ...chatResult, account_notifications: accountResult };
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
        if (action.source === 'account') {
          await markAccountNotificationRead(action.id);
        } else {
          await json('POST', '/communications/chat-notifications.php', {
            action: 'markNotificationRead',
            id: action.id,
            source: action.source,
          }, requestOptions);
        }
      } else {
        await Promise.all([
          json('POST', '/communications/chat-notifications.php', { action: 'markAllNotificationsRead' }, requestOptions),
          markAllAccountNotificationsRead(),
        ]);
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
