'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import MessageCenter from './MessageCenter';
import { useCommunications } from './CommunicationProvider';

export default function FloatingChatBubble() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { snapshot } = useCommunications();
  const rolePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/lecturer') ? '/lecturer' : '/student';

  return (
    <div className="fixed bottom-3 right-3 z-[60] sm:bottom-5 sm:right-5">
      {open && <section
        role="dialog"
        aria-label="Quick messages"
        className="mb-2 flex h-[min(500px,calc(100dvh-5.5rem))] w-[min(380px,calc(100vw-1rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 bg-indigo-700 px-4 py-3 text-white">
          <div className="flex min-w-0 items-center gap-2">
            <MessageCircle size={17} />
            <span className="truncate text-sm font-black">Quick messages</span>
          </div>
          <Link href={`${rolePath}/messages`} onClick={() => setOpen(false)} className="shrink-0 rounded-lg bg-white/10 px-2.5 py-1.5 text-[10px] font-bold hover:bg-white/20">Full inbox</Link>
        </header>
        <div className="min-h-0 flex-1">
          <MessageCenter compact />
        </div>
      </section>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close quick chat' : 'Open quick chat'}
        aria-expanded={open}
        className="relative ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-700 text-white shadow-lg shadow-indigo-950/25 transition hover:bg-indigo-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 sm:h-13 sm:w-13"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && snapshot.unread_messages > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{snapshot.unread_messages > 99 ? '99+' : snapshot.unread_messages}</span>}
      </button>
    </div>
  );
}
