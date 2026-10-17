'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownWideNarrow,
  ArrowLeft,
  Check,
  CheckCircle2,
  Inbox,
  LoaderCircle,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Send,
  X,
} from 'lucide-react';
import type { ChatbotLead } from '@/components/admin/chatbot/types';
import { displayChatbotDate } from '@/components/admin/chatbot/types';
import { api } from '@/lib/api';

type MessageFilter = 'all' | ChatbotLead['status'];
type SortOrder = 'newest' | 'oldest' | 'name';

function getSubject(enquiry: string): string {
  const match = enquiry.match(/^Subject:\s*(.+)$/m);
  return match?.[1]?.trim() || 'Website enquiry';
}

function getMessage(enquiry: string): string {
  return enquiry.replace(/^Subject:\s*.+(?:\r?\n){1,2}/, '').trim() || enquiry;
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase() || '?';
}

function statusStyle(status: ChatbotLead['status']): string {
  if (status === 'new') return 'bg-blue-50 text-blue-700 ring-blue-200';
  if (status === 'contacted') return 'bg-amber-50 text-amber-700 ring-amber-200';
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ChatbotLead[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadMessages = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');
    try {
      const response = await api.chatbot.contactMessages() as { data?: ChatbotLead[] };
      if (!Array.isArray(response.data)) throw new Error('The contact messages endpoint returned invalid data.');
      setMessages(response.data);
      setSelectedId((current) => current ?? response.data?.[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load website contact messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadMessages(); });
  }, [loadMessages]);

  const counts = useMemo(() => ({
    all: messages.length,
    new: messages.filter((message) => message.status === 'new').length,
    contacted: messages.filter((message) => message.status === 'contacted').length,
    closed: messages.filter((message) => message.status === 'closed').length,
  }), [messages]);

  const visibleMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return messages
      .filter((message) => filter === 'all' || message.status === filter)
      .filter((message) => !normalizedQuery || [
        message.name,
        message.email,
        message.phone,
        getSubject(message.enquiry),
        getMessage(message.enquiry),
      ].join(' ').toLowerCase().includes(normalizedQuery))
      .sort((first, second) => {
        if (sort === 'name') return first.name.localeCompare(second.name);
        const difference = new Date(first.created_at.replace(' ', 'T')).getTime()
          - new Date(second.created_at.replace(' ', 'T')).getTime();
        return sort === 'newest' ? -difference : difference;
      });
  }, [filter, messages, query, sort]);

  const selectedMessage = selectedId === null
    ? null
    : visibleMessages.find((message) => message.id === selectedId) ?? visibleMessages[0] ?? null;

  const updateStatus = async (status: ChatbotLead['status']) => {
    if (!selectedMessage || updatingStatus) return;
    setUpdatingStatus(true);
    setError('');
    setNotice('');
    try {
      await api.chatbot.updateLead(selectedMessage.id, status);
      setMessages((current) => current.map((message) => message.id === selectedMessage.id ? { ...message, status } : message));
      setNotice(`Message marked ${status}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the contact message.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMessage || !reply.trim() || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      await api.chatbot.replyToLead(selectedMessage.id, reply.trim());
      setReply('');
      setNotice('Email reply sent and saved to the conversation.');
      await loadMessages(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to email this reply.');
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col gap-5 bg-slate-50/70 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700">Website inbox</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Contact messages</h1>
          <p className="mt-1 text-sm text-slate-600">Review enquiries and reply directly by email.</p>
        </div>
        <button type="button" onClick={() => void loadMessages()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh inbox
        </button>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="ml-auto" aria-label="Dismiss notification"><X size={16} /></button></div>}

      <section aria-label="Contact message inbox" className="grid min-h-[min(720px,calc(100vh-13rem))] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`flex min-h-[560px] flex-col border-b border-slate-200 bg-white lg:border-b-0 lg:border-r ${selectedMessage ? 'hidden lg:flex' : 'flex'}`}>
          <div className="border-b border-slate-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900">Inbox</h2>
                <p className="mt-0.5 text-xs text-slate-500">{counts.all} total · {counts.new} new</p>
              </div>
              <Inbox size={19} className="text-slate-400" />
            </div>
            <label className="relative mt-4 block">
              <Search size={15} className="absolute left-3 top-3 text-slate-400" />
              <span className="sr-only">Search messages</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search messages..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-red-400 focus:bg-white" />
            </label>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <label className="relative">
                <span className="sr-only">Filter messages by status</span>
                <select value={filter} onChange={(event) => setFilter(event.target.value as MessageFilter)} className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
                  <option value="all">All messages ({counts.all})</option>
                  <option value="new">New ({counts.new})</option>
                  <option value="contacted">Contacted ({counts.contacted})</option>
                  <option value="closed">Closed ({counts.closed})</option>
                </select>
              </label>
              <label className="relative">
                <span className="sr-only">Sort messages</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none focus:border-red-400">
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name A–Z</option>
                </select>
                <ArrowDownWideNarrow size={13} className="pointer-events-none absolute right-2 top-2.5 text-slate-400" />
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading && messages.length === 0 ? (
              <div role="status" aria-label="Loading messages" className="space-y-3 p-4">
                <span className="sr-only">Loading messages</span>
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="rhema-skeleton h-20 rounded-xl bg-slate-100" />)}
              </div>
            ) : visibleMessages.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <Inbox size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">{messages.length ? 'No matching messages' : 'Your inbox is empty'}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{messages.length ? 'Try another search or filter.' : 'New website contact form enquiries will appear here.'}</p>
              </div>
            ) : visibleMessages.map((message) => (
              <button key={message.id} type="button" onClick={() => { setSelectedId(message.id); setNotice(''); }} className={`block w-full border-b border-slate-100 px-4 py-4 text-left transition hover:bg-slate-50 ${selectedMessage?.id === message.id ? 'bg-red-50/70 shadow-[inset_3px_0_0_0_#b91c1c]' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${message.status === 'new' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>{getInitials(message.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${message.status === 'new' ? 'font-black text-slate-950' : 'font-bold text-slate-800'}`}>{message.name}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{displayChatbotDate(message.created_at)}</span>
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-700">{getSubject(message.enquiry)}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{getMessage(message.enquiry)}</span>
                    <span className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black capitalize ring-1 ring-inset ${statusStyle(message.status)}`}>{message.status}</span>
                      {!!message.replies?.length && <span className="text-[10px] text-slate-400">{message.replies.length} {message.replies.length === 1 ? 'reply' : 'replies'}</span>}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className={`min-h-[560px] min-w-0 flex-col bg-white ${selectedMessage ? 'flex' : 'hidden lg:flex'}`}>
          {selectedMessage ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <button type="button" onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Back to messages"><ArrowLeft size={18} /></button>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-sm font-black text-red-800">{getInitials(selectedMessage.name)}</span>
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-black text-slate-950">{getSubject(selectedMessage.enquiry)}</h2>
                    <p className="truncate text-xs text-slate-500">{selectedMessage.name} · {selectedMessage.email}</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  {updatingStatus && <LoaderCircle size={14} className="animate-spin" />}
                  <span className="sr-only">Message status</span>
                  <select disabled={updatingStatus} value={selectedMessage.status} onChange={(event) => void updateStatus(event.target.value as ChatbotLead['status'])} className={`rounded-lg px-3 py-2 text-xs font-bold capitalize ring-1 ring-inset outline-none disabled:opacity-60 ${statusStyle(selectedMessage.status)}`}>
                    <option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option>
                  </select>
                </label>
              </header>

              <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50/60 px-4 py-6 sm:px-8">
                <div className="mx-auto max-w-3xl text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">{displayChatbotDate(selectedMessage.created_at)}</div>
                <article className="max-w-2xl rounded-2xl rounded-tl-sm border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="text-sm font-black text-slate-900">{selectedMessage.name}</p><p className="text-xs text-slate-500">{selectedMessage.email}</p></div>
                    <span className="text-[10px] text-slate-400">{displayChatbotDate(selectedMessage.created_at)}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{getMessage(selectedMessage.enquiry)}</p>
                  {selectedMessage.phone && <a href={`tel:${selectedMessage.phone}`} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-700"><Phone size={13} />{selectedMessage.phone}</a>}
                  <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] text-slate-400">Sent from {selectedMessage.page_path}</p>
                </article>
                {(selectedMessage.replies ?? []).map((item) => (
                  <article key={item.id} className="ml-auto max-w-2xl rounded-2xl rounded-tr-sm border border-blue-100 bg-blue-50 p-4 shadow-sm sm:p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-black text-slate-900">{item.admin_name} <span className="font-medium text-slate-500">· Rhema team</span></p>
                      <span className="flex items-center gap-1.5 text-[10px] text-slate-500"><CheckCircle2 size={13} className={item.delivery_status === 'sent' ? 'text-emerald-600' : item.delivery_status === 'failed' ? 'text-red-600' : 'text-amber-600'} />{item.delivery_status} · {displayChatbotDate(item.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{item.reply_text}</p>
                  </article>
                ))}
              </div>

              <form onSubmit={(event) => void sendReply(event)} className="border-t border-slate-200 bg-white p-4 sm:p-5">
                <label htmlFor="contact-message-reply" className="mb-2 block text-xs font-black text-slate-700">Reply to {selectedMessage.name}</label>
                <textarea id="contact-message-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={5000} rows={3} placeholder={`Write an email reply to ${selectedMessage.name}...`} className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 outline-none transition focus:border-red-400 focus:bg-white" />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <a href={`mailto:${selectedMessage.email}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-700"><Mail size={14} /> Email will be sent to {selectedMessage.email}</a>
                  <button type="submit" disabled={!reply.trim() || sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50">
                    {sending ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
                    {sending ? 'Sending reply...' : 'Send email reply'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              {loading ? <LoaderCircle size={28} className="animate-spin text-red-700" /> : <Mail size={34} className="text-slate-300" />}
              <h2 className="mt-4 text-base font-black text-slate-800">{loading ? 'Loading your inbox' : 'Select a message'}</h2>
              <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">{loading ? 'Your latest website enquiries will be ready shortly.' : 'Choose an enquiry from the list to read the full thread and reply.'}</p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
