import { json, request, requestBlob } from '@/lib/api';
import {
  cacheConversationMessages,
  confirmQueuedCommunicationMessage,
  createClientMessageId,
  dispatchCommunicationsUpdated,
  enqueueCommunicationMessage,
  getCachedConversationMessages,
  getQueuedCommunicationMessages,
  getQueuedConversationReads,
  isNetworkFailure,
  queueConversationRead,
  removeQueuedCommunicationMessage,
  removeQueuedConversationRead,
} from '@/lib/communication-offline-store';

const requestOptions = { redirectOnUnauthorized: false };

export async function fetchConversationMessages(conversationId) {
  try {
    const result = await request(`/communications/messages.php?action=messages&conversation_id=${encodeURIComponent(String(conversationId))}`, {}, requestOptions);
    const messages = Array.isArray(result.messages) ? result.messages : [];
    cacheConversationMessages(conversationId, messages);
    void syncPendingCommunicationMessages();
    return { ...result, messages: getCachedConversationMessages(conversationId) };
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    const messages = getCachedConversationMessages(conversationId);
    if (messages.length) return { success: true, messages, offline: true };
    throw new Error('You are offline and no saved messages are available for this conversation.');
  }
}

export async function searchConversationMessages(conversationId, query, offset = 0) {
  try {
    return await request(
      `/communications/messages.php?action=searchMessages&conversation_id=${encodeURIComponent(String(conversationId))}&query=${encodeURIComponent(query)}&offset=${encodeURIComponent(String(offset))}`,
      {},
      requestOptions,
    );
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    const matches = getCachedConversationMessages(conversationId).filter((message) =>
      `${message.body} ${message.sender_name}`.toLowerCase().includes(query.trim().toLowerCase()),
    );
    return { success: true, messages: matches.slice(offset, offset + 100), total: matches.length, limit: 100, offset, offline: true };
  }
}

export function fetchMessageAttachment(id) {
  return requestBlob(`/communications/messages.php?action=attachment&id=${encodeURIComponent(String(id))}`, requestOptions);
}

function getLocalSender() {
  try {
    const user = JSON.parse(window.localStorage.getItem('rhema_user') || '{}');
    return {
      sender_role: String(user.role || ''),
      sender_id: String(user.id ?? user.student_id ?? ''),
      sender_name: String(user.name || user.full_name || 'You'),
    };
  } catch (cause) {
    console.error('Offline messages could not read the signed-in user details.', cause);
    return { sender_role: '', sender_id: '', sender_name: 'You' };
  }
}

function queueTextMessage(conversationId, body, clientMessageId) {
  const queued = getQueuedCommunicationMessages();
  const sender = typeof window === 'undefined' ? { sender_role: '', sender_id: '', sender_name: 'You' } : getLocalSender();
  const message = {
    id: -(Date.now() + queued.length),
    conversation_id: conversationId,
    ...sender,
    body,
    created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
    pending: true,
    client_message_id: clientMessageId,
  };
  if (!enqueueCommunicationMessage({ client_message_id: clientMessageId, conversation_id: conversationId, body, message })) {
    throw new Error('Your message could not be saved offline. Check browser storage and try again.');
  }
  dispatchCommunicationsUpdated();
  return { success: true, queued: true, message_id: message.id };
}

export async function sendConversationMessage(data) {
  const conversationId = Number(data.conversation_id);
  const body = data.body || '';
  if (data.file && typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Attachments cannot be queued offline. Reconnect and try sending the attachment again.');
  }
  const clientMessageId = createClientMessageId();
  const payload = { action: 'send', ...data, client_message_id: clientMessageId };

  try {
    if (!data.file || typeof File === 'undefined' || !(data.file instanceof File)) {
      return await json('POST', '/communications/messages.php', payload, requestOptions);
    }
    const formData = new FormData();
    formData.append('action', 'send');
    formData.append('conversation_id', String(conversationId));
    formData.append('body', body);
    formData.append('client_message_id', clientMessageId);
    formData.append('file', data.file);
    return await request('/communications/messages.php', { method: 'POST', body: formData }, requestOptions);
  } catch (cause) {
    if (!isNetworkFailure(cause) || data.file) throw cause;
    return queueTextMessage(conversationId, body, clientMessageId);
  }
}

export async function markConversationRead(conversationId) {
  try {
    return await json('POST', '/communications/messages.php', { action: 'markRead', conversation_id: conversationId }, requestOptions);
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    if (!queueConversationRead(conversationId)) {
      throw new Error('The conversation read status could not be saved for offline synchronization.');
    }
    return { success: true, queued: true };
  }
}

export async function syncPendingCommunicationMessages() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  let updated = false;

  for (const queued of getQueuedCommunicationMessages()) {
    try {
      const result = await json('POST', '/communications/messages.php', {
        action: 'send',
        conversation_id: queued.conversation_id,
        body: queued.body,
        client_message_id: queued.client_message_id,
      }, requestOptions);
      if (typeof result.message_id !== 'undefined') {
        updated = confirmQueuedCommunicationMessage(queued.client_message_id, Number(result.message_id)) || updated;
      } else {
        removeQueuedCommunicationMessage(queued.client_message_id);
        updated = true;
      }
    } catch (cause) {
      if (!isNetworkFailure(cause)) {
        console.error('A queued chat message could not be synchronized.', cause);
      }
      break;
    }
  }

  for (const conversationId of getQueuedConversationReads()) {
    try {
      await json('POST', '/communications/messages.php', { action: 'markRead', conversation_id: conversationId }, requestOptions);
      removeQueuedConversationRead(conversationId);
      updated = true;
    } catch (cause) {
      if (!isNetworkFailure(cause)) {
        console.error('A queued conversation read status could not be synchronized.', cause);
      }
      break;
    }
  }
  if (updated) dispatchCommunicationsUpdated();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void syncPendingCommunicationMessages());
}
