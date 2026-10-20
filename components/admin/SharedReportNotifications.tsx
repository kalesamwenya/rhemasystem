'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, FileText } from 'lucide-react';
import { api } from '@/lib/api';

interface ReportNotification {
  id: number;
  title: string;
  message: string;
  action_url: string;
  read_at: string | null;
  created_at: string;
}

export default function SharedReportNotifications() {
  const [notifications, setNotifications] = useState<ReportNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.adminReports.notifications() as { notifications?: ReportNotification[] };
      if (!Array.isArray(response.notifications)) throw new Error('The report notification response was invalid.');
      setNotifications(response.notifications);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load shared report notifications.');
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadNotifications(), 0);
    const refreshInterval = window.setInterval(() => void loadNotifications(), 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(refreshInterval);
    };
  }, [loadNotifications]);

  const markRead = async (notification: ReportNotification) => {
    if (notification.read_at) return;
    try {
      await api.adminReports.markNotificationRead(notification.id);
      setNotifications((current) => current.map((item) => item.id === notification.id
        ? { ...item, read_at: new Date().toISOString() }
        : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to mark this report notification as read.');
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={`Shared report notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className={`relative rounded-xl border border-transparent p-2.5 text-slate-500 transition-colors hover:bg-slate-50 ${open ? 'border-slate-200 bg-slate-50 text-slate-900' : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <section aria-label="Shared report notifications" className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <header className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Shared report notifications</h2>
          </header>
          {error && <p role="alert" className="px-4 py-3 text-xs text-red-700">{error}</p>}
          {!error && notifications.length === 0 && <p className="px-4 py-5 text-center text-sm text-slate-500">No reports have been shared with your department.</p>}
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={notification.action_url}
                onClick={() => {
                  setOpen(false);
                  void markRead(notification);
                }}
                className={`flex gap-3 border-b border-slate-100 px-4 py-3 hover:bg-slate-50 ${notification.read_at ? '' : 'bg-emerald-50/40'}`}
              >
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#31584c]" />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800">{notification.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                  <span className="mt-1 block text-[10px] text-slate-400">{new Date(notification.created_at.replace(' ', 'T')).toLocaleString()}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
