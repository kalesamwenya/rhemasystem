'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCommunications, type CommunicationNotification } from './CommunicationProvider';

interface NotificationToast {
  notification: CommunicationNotification;
  key: string;
  closing: boolean;
}

function getNotificationKey(notification: CommunicationNotification) {
  return `${notification.source || 'communications'}:${notification.id}`;
}

export default function AdminNotificationToasts() {
  const router = useRouter();
  const { snapshot, hasLoaded, markNotificationRead } = useCommunications();
  const [toasts, setToasts] = useState<NotificationToast[]>([]);
  const initialized = useRef(false);
  const seenNotifications = useRef(new Set<string>());
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((key: string) => {
    const timer = timers.current.get(key);
    if (timer !== undefined) window.clearTimeout(timer);
    setToasts((current) => current.map((toast) => toast.key === key ? { ...toast, closing: true } : toast));
    timers.current.set(key, window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.key !== key));
      timers.current.delete(key);
    }, 250));
  }, []);

  useEffect(() => {
    if (!hasLoaded) return;
    if (!initialized.current) {
      snapshot.notifications.forEach((notification) => seenNotifications.current.add(getNotificationKey(notification)));
      initialized.current = true;
      return;
    }

    const incoming = snapshot.notifications.filter((notification) => {
      const key = getNotificationKey(notification);
      const isNew = !notification.read_at && !seenNotifications.current.has(key);
      seenNotifications.current.add(key);
      return isNew;
    });
    if (incoming.length) {
      setToasts((current) => [
        ...current,
        ...incoming.map((notification) => ({ notification, key: getNotificationKey(notification), closing: false })),
      ].slice(-3));
    }
  }, [hasLoaded, snapshot.notifications]);

  useEffect(() => {
    toasts.forEach((toast) => {
      if (timers.current.has(toast.key)) return;
      timers.current.set(toast.key, window.setTimeout(() => dismiss(toast.key), 6500));
    });
  }, [dismiss, toasts]);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
  }, []);

  const openNotification = (notification: CommunicationNotification) => {
    if (!notification.read_at) void markNotificationRead(notification);
    router.push(notification.action_url || '/admin/notifications');
  };

  if (!toasts.length) return null;

  return (
    <div aria-label="New notifications" className="pointer-events-none fixed bottom-5 left-4 z-[70] flex w-[min(24rem,calc(100vw-5.5rem))] flex-col gap-3 sm:bottom-6 sm:left-6">
      {toasts.map(({ notification, key, closing }) => (
        <section
          key={key}
          role="status"
          aria-live="polite"
          className={`pointer-events-auto flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white p-4 text-slate-900 shadow-xl shadow-slate-950/15 transition-all duration-300 ${closing ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'}`}
        >
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Bell aria-hidden="true" className="h-4 w-4" />
          </span>
          <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
            <span className="block truncate text-xs font-black">{notification.title || 'New notification'}</span>
            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-slate-600">{notification.message}</span>
            <span className="mt-2 block text-[10px] font-bold text-indigo-700">Open notification</span>
          </button>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(key)}
            className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </section>
      ))}
    </div>
  );
}
