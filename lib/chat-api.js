import { request, json } from '@/lib/api';
import {
  cacheCommunicationContacts,
  getCachedCommunicationContacts,
  isNetworkFailure,
} from '@/lib/communication-offline-store';

const requestOptions = { redirectOnUnauthorized: false };

export async function fetchChatContacts() {
  try {
    const result = await request('/communications/chat.php?action=contacts', {}, requestOptions);
    cacheCommunicationContacts(result);
    return result;
  } catch (cause) {
    if (!isNetworkFailure(cause)) throw cause;
    const cached = getCachedCommunicationContacts();
    if (cached) return { ...cached, offline: true };
    throw new Error('You are offline and no saved chat contacts are available.');
  }
}

export function createChatConversation(data) {
  return json('POST', '/communications/chat.php', { action: 'create', ...data }, requestOptions);
}

export function openGlobalAdminChat() {
  return json('POST', '/communications/chat.php', { action: 'globalAdminGroup' }, requestOptions);
}
