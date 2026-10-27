const STORAGE_PREFIX = 'rhema_communications_offline_v1:';

function getStorageKey() {
  if (typeof window === 'undefined') return null;
  try {
    const user = JSON.parse(window.localStorage.getItem('rhema_user') || 'null');
    const role = String(user?.role || '').trim().toLowerCase();
    const id = String(user?.id ?? user?.student_id ?? '').trim();
    return role && id ? `${STORAGE_PREFIX}${encodeURIComponent(role)}:${encodeURIComponent(id)}` : null;
  } catch (cause) {
    console.error('Offline communications could not identify the signed-in account.', cause);
    return null;
  }
}

function emptyStore() {
  return {
    messages: {},
    queuedMessages: [],
    queuedConversationReads: [],
    queuedNotificationActions: [],
  };
}

function readStore() {
  const key = getStorageKey();
  if (!key) return emptyStore();
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return emptyStore();
    const value = JSON.parse(stored);
    return {
      ...emptyStore(),
      ...value,
      messages: value.messages && typeof value.messages === 'object' ? value.messages : {},
      queuedMessages: Array.isArray(value.queuedMessages) ? value.queuedMessages : [],
      queuedConversationReads: Array.isArray(value.queuedConversationReads) ? value.queuedConversationReads : [],
      queuedNotificationActions: Array.isArray(value.queuedNotificationActions) ? value.queuedNotificationActions : [],
    };
  } catch (cause) {
    console.error('Saved offline communications could not be read.', cause);
    return emptyStore();
  }
}

function writeStore(store) {
  const key = getStorageKey();
  if (!key) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(store));
    return true;
  } catch (cause) {
    console.error('Offline communications could not be saved in this browser.', cause);
    return false;
  }
}

export function cacheCommunicationSnapshot(snapshot) {
  const store = readStore();
  store.snapshot = snapshot;
  writeStore(store);
}

export function getCachedCommunicationSnapshot() {
  return readStore().snapshot ?? null;
}

export function cacheCommunicationContacts(contacts) {
  const store = readStore();
  store.contacts = contacts;
  writeStore(store);
}

export function getCachedCommunicationContacts() {
  return readStore().contacts ?? null;
}

export function cacheConversationMessages(conversationId, messages) {
  const store = readStore();
  store.messages[String(conversationId)] = messages.slice(-100);
  writeStore(store);
}

export function getCachedConversationMessages(conversationId) {
  const store = readStore();
  const cached = store.messages[String(conversationId)] || [];
  const queued = store.queuedMessages
    .filter((item) => item.conversation_id === conversationId)
    .map((item) => item.message);
  return [...cached, ...queued];
}

export function enqueueCommunicationMessage(item) {
  const store = readStore();
  store.queuedMessages = [
    ...store.queuedMessages.filter((queued) => queued.client_message_id !== item.client_message_id),
    item,
  ];
  return writeStore(store);
}

export function getQueuedCommunicationMessages() {
  return readStore().queuedMessages;
}

export function removeQueuedCommunicationMessage(clientMessageId) {
  const store = readStore();
  store.queuedMessages = store.queuedMessages.filter((item) => item.client_message_id !== clientMessageId);
  writeStore(store);
}

export function confirmQueuedCommunicationMessage(clientMessageId, messageId) {
  const store = readStore();
  const queued = store.queuedMessages.find((item) => item.client_message_id === clientMessageId);
  if (!queued) return false;
  const confirmed = {
    ...queued.message,
    id: messageId,
    pending: false,
  };
  const messages = store.messages[String(queued.conversation_id)] || [];
  store.messages[String(queued.conversation_id)] = [
    ...messages.filter((message) => message.client_message_id !== clientMessageId && message.id !== messageId),
    confirmed,
  ].slice(-100);
  store.queuedMessages = store.queuedMessages.filter((item) => item.client_message_id !== clientMessageId);
  return writeStore(store);
}

export function queueConversationRead(conversationId) {
  const store = readStore();
  store.queuedConversationReads = [...new Set([...store.queuedConversationReads, conversationId])];
  return writeStore(store);
}

export function getQueuedConversationReads() {
  return readStore().queuedConversationReads;
}

export function removeQueuedConversationRead(conversationId) {
  const store = readStore();
  store.queuedConversationReads = store.queuedConversationReads.filter((id) => id !== conversationId);
  writeStore(store);
}

export function queueNotificationAction(action) {
  const store = readStore();
  store.queuedNotificationActions = [...store.queuedNotificationActions, action];
  return writeStore(store);
}

export function getQueuedNotificationActions() {
  return readStore().queuedNotificationActions;
}

export function removeQueuedNotificationAction(action) {
  const store = readStore();
  store.queuedNotificationActions = store.queuedNotificationActions.filter((item) =>
    item.kind !== action.kind
    || (item.kind === 'read' && action.kind === 'read' && (item.id !== action.id || item.source !== action.source)),
  );
  writeStore(store);
}

export function isNetworkFailure(cause) {
  return cause instanceof Error && (cause.name === 'NetworkRequestError' || cause instanceof TypeError);
}

export function createClientMessageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}

export function dispatchCommunicationsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rhema:communications-updated'));
  }
}
