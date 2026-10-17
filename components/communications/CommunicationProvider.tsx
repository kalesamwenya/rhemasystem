'use client';

import { api } from '@/lib/api';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

export interface CommunicationConversation {
  id: number;
  conversation_type: 'direct' | 'group';
  title: string | null;
  display_title: string;
  direct_contact_key?: string | null;
  last_message: string | null;
  last_message_at: string | null;
  last_message_id?: number | null;
  last_message_sender_role?: string | null;
  last_message_sender_id?: string | null;
  unread_count: number;
}

export interface CommunicationNotification {
  id: number;
  type?: string;
  title: string;
  message: string;
  conversation_id: number | null;
  created_at: string;
  read_at: string | null;
  action_url?: string | null;
  source?: 'communications' | 'account';
}

export interface CommunicationSnapshot {
  conversations: CommunicationConversation[];
  notifications: CommunicationNotification[];
  unread_messages: number;
  unread_notifications: number;
}

interface CommunicationContextValue {
  snapshot: CommunicationSnapshot;
  loading: boolean;
  soundsEnabled: boolean;
  error: string;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  markNotificationRead: (notification: CommunicationNotification) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  toggleSounds: () => void;
}

const emptySnapshot: CommunicationSnapshot = {
  conversations: [],
  notifications: [],
  unread_messages: 0,
  unread_notifications: 0,
};

export function isChatNotification(notification: CommunicationNotification) {
  return notification.conversation_id != null
    || /chat|messages?|messaging|conversations?|inbox|communications?/i.test(`${notification.type || ''} ${notification.title} ${notification.action_url || ''}`);
}

const CommunicationContext = createContext<CommunicationContextValue>({
  snapshot: emptySnapshot,
  loading: false,
  soundsEnabled: true,
  error: '',
  refresh: async () => {},
  retry: async () => {},
  markNotificationRead: async () => {},
  markAllNotificationsRead: async () => {},
  toggleSounds: () => {},
});

export function CommunicationProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.localStorage.getItem('rhema_communication_sounds') !== 'false';
    } catch {
      return true;
    }
  });
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const audioPlayers = useRef<Partial<Record<'chat' | 'notification', HTMLAudioElement>>>({});
  const initialized = useRef(false);
  const seenNotificationKeys = useRef(new Set<string>());
  const previousMessages = useRef(new Map<number, number>());
  const refreshing = useRef(false);
  const pollingFailures = useRef(0);

  const toggleSounds = useCallback(() => {
    setSoundsEnabled((current) => {
      const next = !current;
      try {
        window.localStorage.setItem('rhema_communication_sounds', String(next));
      } catch {
        // Keep the current-page preference even when storage is unavailable.
      }
      return next;
    });
  }, []);

  const playSound = useCallback((kind: 'chat' | 'notification') => {
    if (!soundsEnabled) return;
    try {
      const audio = audioPlayers.current[kind] ?? new Audio(`/sounds/${kind === 'chat' ? 'chat-message' : 'notification'}.wav`);
      audioPlayers.current[kind] = audio;
      audio.currentTime = 0;
      void audio.play().catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'NotAllowedError') return;
        console.error('Communications sound could not be played.', cause);
      });
    } catch (cause) {
      console.error('Communications sound could not be initialized.', cause);
    }
  }, [soundsEnabled]);

  useEffect(() => {
    if (!enabled) return;
    const preloadAudio = () => {
      (['chat', 'notification'] as const).forEach((kind) => {
        if (audioPlayers.current[kind]) return;
        const audio = new Audio(`/sounds/${kind === 'chat' ? 'chat-message' : 'notification'}.wav`);
        audio.preload = 'auto';
        audioPlayers.current[kind] = audio;
      });
    };
    window.addEventListener('pointerdown', preloadAudio, { once: true });
    window.addEventListener('keydown', preloadAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', preloadAudio);
      window.removeEventListener('keydown', preloadAudio);
    };
  }, [enabled]);

  const refresh = useCallback(async () => {
    if (!enabled || refreshing.current) return;
    refreshing.current = true;
    if (!initialized.current) setLoading(true);
    try {
      const result: Partial<CommunicationSnapshot> = await api.communications.snapshot();
      pollingFailures.current = 0;
      const conversations = Array.isArray(result.conversations) ? result.conversations : [];
      const communicationsNotifications = Array.isArray(result.notifications) ? result.notifications : [];
      let currentUser: { role?: string; id?: string | number } | null = null;
      let currentUserError = '';
      try {
        currentUser = JSON.parse(window.localStorage.getItem('rhema_user') || 'null');
      } catch {
        currentUserError = 'Your saved account information is unreadable. Sign out and sign in again to restore communications.';
      }
      const incomingMessage = conversations.some((conversation) => {
        const messageId = Number(conversation.last_message_id) || 0;
        const previousMessageId = previousMessages.current.get(conversation.id) || 0;
        return messageId > previousMessageId
          && (conversation.last_message_sender_role !== currentUser?.role
            || String(conversation.last_message_sender_id) !== String(currentUser?.id));
      });
      const incomingNotification = communicationsNotifications.some((notification) => {
        const key = `communications:${notification.id}`;
        return !notification.read_at && !seenNotificationKeys.current.has(key);
      });
      let accountNotifications: CommunicationNotification[] = [];
      let legacyUnread = 0;
      let legacyLoadError = '';
      try {
        if (currentUser && ['student', 'lecturer', 'admin'].includes(currentUser.role || '')) {
          const legacyResult: { data?: CommunicationNotification[] } = await api.notifications.myList();
          const source = Array.isArray(legacyResult.data) ? legacyResult.data : [];
          accountNotifications = source.map((item: CommunicationNotification) => ({ ...item, source: 'account' }));
          legacyUnread = accountNotifications.filter((item) => !item.read_at && !isChatNotification(item)).length;
        }
      } catch (cause) {
        legacyLoadError = cause instanceof Error ? `Communications loaded, but account notifications failed to load: ${cause.message}` : 'Account notifications failed to load.';
      }
      const allNotifications = [
        ...accountNotifications,
        ...communicationsNotifications.map((item) => ({ ...item, source: 'communications' as const })),
      ];
      const newUnreadNotification = allNotifications.some((notification) => {
        const key = `${notification.source || 'communications'}:${notification.id}`;
        return !notification.read_at && !seenNotificationKeys.current.has(key);
      });
      seenNotificationKeys.current = new Set(allNotifications.map((notification) => `${notification.source || 'communications'}:${notification.id}`));
      if (initialized.current) {
        if (incomingMessage) playSound('chat');
        if (!incomingMessage && (incomingNotification || newUnreadNotification)) playSound('notification');
      }
      initialized.current = true;
      previousMessages.current = new Map(conversations.map((conversation) => [
        conversation.id,
        Number(conversation.last_message_id) || 0,
      ]));
      const visibleNotifications = allNotifications.filter((item) => !isChatNotification(item));
      setSnapshot({
        conversations,
        notifications: visibleNotifications,
        unread_messages: Number(result.unread_messages) || 0,
        unread_notifications: (Number(result.unread_notifications) || 0) + legacyUnread,
      });
      setError(currentUserError || legacyLoadError);
    } catch (cause) {
      pollingFailures.current += 1;
      setError(cause instanceof Error ? cause.message : 'Unable to refresh communications.');
    } finally {
      refreshing.current = false;
      setLoading(false);
    }
  }, [enabled, playSound]);

  const retry = useCallback(async () => {
    pollingFailures.current = 0;
    setRetryKey((current) => current + 1);
  }, []);

  const markNotificationRead = useCallback(async (notification: CommunicationNotification) => {
    try {
      if (notification.source === 'account') {
        await api.notifications.markMyRead(notification.id);
      } else {
        await api.communications.markNotificationRead(notification.id);
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark this notification as read.');
    }
  }, [refresh]);

  const markAllNotificationsRead = useCallback(async () => {
    const unreadNotifications = snapshot.notifications.filter((notification) => !notification.read_at);
    if (!unreadNotifications.length) return;

    const accountUnread = unreadNotifications.some((notification) => notification.source === 'account');
    const communicationsUnread = unreadNotifications.some((notification) => notification.source !== 'account');
    const operations: Promise<unknown>[] = [];
    if (accountUnread) operations.push(api.notifications.markMyAllRead());
    if (communicationsUnread) operations.push(api.communications.markAllNotificationsRead());

    const results = await Promise.allSettled(operations);
    await refresh();
    const failed = results.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') {
      setError(failed.reason instanceof Error ? failed.reason.message : 'Unable to mark all notifications as read.');
    }
  }, [refresh, snapshot.notifications]);

  useEffect(() => {
    if (!enabled) return;
    let timer: number;
    let active = true;
    const poll = async () => {
      if (!active) return;
      if (pollingFailures.current >= 3) return;
      if (document.visibilityState === 'visible') {
        await refresh();
      }
      if (pollingFailures.current >= 3) return;
      const delay = pollingFailures.current
        ? Math.min(10000 * (2 ** Math.min(pollingFailures.current - 1, 5)), 300000)
        : 5000;
      timer = window.setTimeout(() => void poll(), delay);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !active || pollingFailures.current >= 3) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void poll(), 0);
    };
    timer = window.setTimeout(() => void poll(), 0);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, refresh, retryKey]);

  useEffect(() => () => {
    Object.values(audioPlayers.current).forEach((audio) => {
      audio?.pause();
      if (audio) audio.src = '';
    });
  }, []);

  const value = useMemo(() => ({
    snapshot,
    loading,
    soundsEnabled,
    error,
    refresh,
    retry,
    markNotificationRead,
    markAllNotificationsRead,
    toggleSounds,
  }), [snapshot, loading, soundsEnabled, error, refresh, retry, markNotificationRead, markAllNotificationsRead, toggleSounds]);
  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

export function useCommunications() {
  return useContext(CommunicationContext);
}
