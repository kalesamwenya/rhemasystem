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
  source?: 'communications' | 'student';
}

export interface CommunicationSnapshot {
  conversations: CommunicationConversation[];
  notifications: CommunicationNotification[];
  unread_messages: number;
  unread_notifications: number;
}

interface CommunicationContextValue {
  snapshot: CommunicationSnapshot;
  error: string;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  markNotificationRead: (notification: CommunicationNotification) => Promise<void>;
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
  error: '',
  refresh: async () => {},
  retry: async () => {},
  markNotificationRead: async () => {},
});

export function CommunicationProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const audioContext = useRef<AudioContext | null>(null);
  const initialized = useRef(false);
  const seenNotificationKeys = useRef(new Set<string>());
  const previousMessages = useRef(new Map<number, number>());
  const refreshing = useRef(false);
  const pollingFailures = useRef(0);

  const playSound = useCallback((kind: 'chat' | 'notification') => {
    try {
      const AudioContextConstructor = window.AudioContext;
      if (!AudioContextConstructor) return;
      audioContext.current ??= new AudioContextConstructor();
      const context = audioContext.current;
      const playTone = (frequency: number, startAt: number, duration: number) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration);
      };
      const play = () => {
        const startAt = context.currentTime;
        if (kind === 'chat') {
          playTone(880, startAt, 0.12);
          playTone(1174.66, startAt + 0.15, 0.16);
        } else {
          playTone(659.25, startAt, 0.22);
        }
      };
      if (context.state === 'suspended') {
        void context.resume().then(play).catch(() => {});
      } else {
        play();
      }
    } catch {
      // Sound is an enhancement; unsupported or blocked audio must not interrupt messaging.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const unlockAudio = () => {
      if (!window.AudioContext) return;
      audioContext.current ??= new window.AudioContext();
      if (audioContext.current.state === 'suspended') {
        void audioContext.current.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [enabled]);

  const refresh = useCallback(async () => {
    if (!enabled || refreshing.current) return;
    refreshing.current = true;
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
      let legacyNotifications: CommunicationNotification[] = [];
      let legacyUnread = 0;
      let legacyLoadError = '';
      try {
        if (currentUser?.role === 'student') {
          const legacyResult: { data?: CommunicationNotification[] } = await api.notifications.myList();
          const source = Array.isArray(legacyResult.data) ? legacyResult.data : [];
          legacyNotifications = source.map((item: CommunicationNotification) => ({ ...item, source: 'student' }));
          legacyUnread = legacyNotifications.filter((item) => !item.read_at && !isChatNotification(item)).length;
        }
      } catch (cause) {
        legacyLoadError = cause instanceof Error ? `Communications loaded, but existing notifications failed to load: ${cause.message}` : 'Existing notifications failed to load.';
      }
      const allNotifications = [
        ...legacyNotifications,
        ...communicationsNotifications.map((item) => ({ ...item, source: 'communications' as const })),
      ];
      const newUnreadNotification = allNotifications.some((notification) => {
        const key = `${notification.source || 'communications'}:${notification.id}`;
        return !notification.read_at && !seenNotificationKeys.current.has(key);
      });
      seenNotificationKeys.current = new Set(allNotifications.map((notification) => `${notification.source || 'communications'}:${notification.id}`));
      if (initialized.current) {
        if (incomingMessage) playSound('chat');
        if (incomingNotification || newUnreadNotification) playSound('notification');
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
    }
  }, [enabled, playSound]);

  const retry = useCallback(async () => {
    pollingFailures.current = 0;
    setRetryKey((current) => current + 1);
  }, []);

  const markNotificationRead = useCallback(async (notification: CommunicationNotification) => {
    try {
      if (notification.source === 'student') {
        await api.notifications.markMyRead(notification.id);
      } else {
        await api.communications.markNotificationRead(notification.id);
      }
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark this notification as read.');
    }
  }, [refresh]);

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
    if (audioContext.current && audioContext.current.state !== 'closed') {
      void audioContext.current.close();
    }
  }, []);

  const value = useMemo(() => ({ snapshot, error, refresh, retry, markNotificationRead }), [snapshot, error, refresh, retry, markNotificationRead]);
  return <CommunicationContext.Provider value={value}>{children}</CommunicationContext.Provider>;
}

export function useCommunications() {
  return useContext(CommunicationContext);
}
