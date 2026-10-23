'use client';

import Link from 'next/link';
import { Bell, MessageSquare, RotateCw, Volume2, VolumeX } from 'lucide-react';
import { isChatNotification, useCommunications } from './CommunicationProvider';

export default function CommunicationDropdown({
  kind,
  isOpen,
  onToggle,
  rolePath,
}: {
  kind: 'messages' | 'notifications';
  isOpen: boolean;
  onToggle: () => void;
  rolePath: '/admin' | '/lecturer' | '/student';
}) {
  const { snapshot, loading, soundsEnabled, error, retry, markNotificationRead, toggleSounds } = useCommunications();
  const messages = kind === 'messages';
  const notifications = snapshot.notifications.filter((item) => !isChatNotification(item));
  const unread = messages ? snapshot.unread_messages : snapshot.unread_notifications;
  const href = `${rolePath}/${messages ? 'messages' : 'notifications'}`;
  const Icon = messages ? MessageSquare : Bell;

  return (
    <div className="relative">
      <button type="button" onClick={onToggle} aria-label={messages ? 'Open messages' : 'Open notifications'} aria-expanded={isOpen} className={`relative rounded-xl border border-transparent p-2.5 text-slate-500 transition-colors hover:bg-slate-50 ${isOpen ? 'border-slate-200 bg-slate-50 text-slate-900' : ''}`}>
        <Icon className="h-5 w-5" />
        {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {isOpen && <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <span className="min-w-0 max-w-[130px] text-xs font-bold uppercase leading-4 tracking-wide text-slate-700">{messages ? 'Recent conversations' : 'Recent notifications'}</span>
          <button
            type="button"
            onClick={toggleSounds}
            role="switch"
            aria-checked={soundsEnabled}
            aria-label={`${soundsEnabled ? 'Mute' : 'Enable'} notification and chat sounds`}
            title={`${soundsEnabled ? 'Mute' : 'Enable'} notification and chat sounds`}
            className="group inline-flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              soundsEnabled ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
            }`}>
              {soundsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </span>
            <span className="text-xs font-semibold text-slate-700">Sound</span>
            <span className={`relative h-5 w-9 rounded-full transition-colors ${
              soundsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
            }`}>
              <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                soundsEnabled ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </span>
          </button>
        </div>
        {error && <div role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          <p>{error}</p>
          <button type="button" onClick={() => void retry()} className="mt-2 inline-flex items-center gap-1.5 font-bold text-red-800 hover:text-red-950">
            <RotateCw className="h-3 w-3" /> Retry communications
          </button>
        </div>}
        <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {messages
            ? snapshot.conversations.slice(0, 6).map((item) => <Link key={item.id} href={`${href}?conversation=${item.id}`} onClick={onToggle} className="block p-4 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-semibold text-slate-800">{item.display_title}</span>{item.unread_count > 0 && <span className="text-xs font-bold text-indigo-700">{item.unread_count} new</span>}</div>
              <p className="mt-1 truncate text-xs text-slate-500">{item.last_message || 'No messages yet'}</p>
            </Link>)
            : notifications.slice(0, 6).map((item) => (() => {
              const notificationHref = item.action_url || null;
              const content = <>
                <span className="block truncate text-sm font-semibold text-slate-800">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{item.message}</span>
              </>;
              const handleOpen = () => {
                if (!item.read_at) void markNotificationRead(item);
                onToggle();
              };
              return notificationHref
                ? <Link key={`${item.source || 'communications'}:${item.id}`} href={notificationHref} onClick={handleOpen} className="block p-4 hover:bg-slate-50">{content}</Link>
                : <button key={`${item.source || 'communications'}:${item.id}`} type="button" onClick={handleOpen} className="block w-full p-4 text-left hover:bg-slate-50">{content}</button>;
            })())}
          {!(messages ? snapshot.conversations.length : notifications.length) && <p role={loading ? 'status' : undefined} className="p-5 text-center text-sm text-slate-500">{loading ? 'Loading your updates…' : messages ? 'No conversations yet.' : 'No notifications yet.'}</p>}
        </div>
        <Link href={href} onClick={onToggle} className="block border-t border-slate-100 px-4 py-3 text-center text-xs font-semibold text-indigo-700 hover:bg-slate-50">{messages ? 'Open message center' : 'View all notifications'}</Link>
      </div>}
    </div>
  );
}
