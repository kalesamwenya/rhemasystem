'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, MessageCircle, Search, Send, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { fetchChatContacts, createChatConversation } from '@/lib/chat-api';
import {
  fetchConversationMessages,
  markConversationRead,
  sendConversationMessage,
} from '@/lib/messages-api';
import { useCommunications, type CommunicationConversation } from './CommunicationProvider';

interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'lecturer' | 'student';
}

interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: string;
  sender_role: string;
  sender_name: string;
  body: string;
  created_at: string;
  pending?: boolean;
}

type PanelTab = 'inbox' | 'people';

function getInitials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function formatTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}

export default function FloatingChatBubble() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<PanelTab>('inbox');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [panelError, setPanelError] = useState('');
  const [currentUser] = useState<{ id?: string | number; student_id?: string | number; role?: string }>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem('rhema_user') || '{}');
    } catch {
      return {};
    }
  });
  const pathname = usePathname();
  const { snapshot, error, refresh, retry } = useCommunications();
  const messagePane = useRef<HTMLDivElement>(null);
  const contactsLoaded = useRef(false);
  const lastMarkedMessageId = useRef(0);
  const rolePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/lecturer') ? '/lecturer' : '/student';
  const selectedConversation = snapshot.conversations.find((conversation) => conversation.id === selectedConversationId) || null;
  const threadOpen = selectedConversationId !== null;
  const threadTitle = selectedConversation?.display_title || selectedContact?.name || 'Conversation';
  const filteredConversations = useMemo(() => snapshot.conversations.filter((conversation) =>
    `${conversation.display_title} ${conversation.last_message || ''}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [snapshot.conversations, search]);
  const filteredContacts = useMemo(() => contacts.filter((contact) =>
    `${contact.name} ${contact.role} ${contact.email}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [contacts, search]);

  useEffect(() => {
    if (!open || contactsLoaded.current) return;
    let active = true;
    fetchChatContacts()
      .then((result: { contacts?: Contact[] }) => {
        if (active) {
          setContacts(Array.isArray(result.contacts) ? result.contacts : []);
          contactsLoaded.current = true;
        }
      })
      .catch((cause: unknown) => {
        if (active) setPanelError(cause instanceof Error ? cause.message : 'Unable to load people to chat with.');
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!selectedConversationId || !open) return;
    let active = true;
    let timer: number;
    let loading = false;
    const poll = async () => {
      if (!active || loading) return;
      loading = true;
      try {
        const result = await fetchConversationMessages(selectedConversationId) as { messages?: ChatMessage[] };
        if (!active) return;
        const nextMessages = Array.isArray(result.messages) ? result.messages : [];
        setMessages(nextMessages);
        setPanelError('');
        const latestMessageId = nextMessages.reduce((latest, message) => Math.max(latest, message.id), 0);
        if (latestMessageId > lastMarkedMessageId.current) {
          await markConversationRead(selectedConversationId);
          lastMarkedMessageId.current = latestMessageId;
          await refresh();
        }
      } catch (cause) {
        if (active) setPanelError(cause instanceof Error ? cause.message : 'Unable to load this conversation.');
      } finally {
        loading = false;
        if (active) {
          setLoadingMessages(false);
          timer = window.setTimeout(() => void poll(), 12000);
        }
      }
    };
    const refreshAfterSync = () => {
      if (!loading) void poll();
    };
    void poll();
    window.addEventListener('rhema:communications-updated', refreshAfterSync);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.removeEventListener('rhema:communications-updated', refreshAfterSync);
    };
  }, [open, refresh, selectedConversationId]);

  useEffect(() => {
    const pane = messagePane.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [messages.length, selectedConversationId]);

  async function openConversation(conversation: CommunicationConversation) {
    setPanelError('');
    setLoadingMessages(true);
    lastMarkedMessageId.current = 0;
    setMessages([]);
    setSelectedContact(null);
    setSelectedConversationId(conversation.id);
  }

  async function openContact(contact: Contact) {
    setPanelError('');
    const existing = snapshot.conversations.find((conversation) =>
      conversation.direct_contact_key === `${contact.role}:${contact.id}`,
    );
    if (existing) {
      setActiveTab('inbox');
      setLoadingMessages(true);
      lastMarkedMessageId.current = 0;
      setMessages([]);
      setSelectedContact(contact);
      setSelectedConversationId(existing.id);
      return;
    }
    setLoadingMessages(true);
    try {
      const result = await createChatConversation({
        participants: [{ role: contact.role, id: contact.id }],
      }) as { conversation_id?: number | string };
      const conversationId = Number(result.conversation_id);
      if (!Number.isInteger(conversationId) || conversationId < 1) {
        throw new Error('The conversation could not be opened.');
      }
      await refresh();
      setActiveTab('inbox');
      lastMarkedMessageId.current = 0;
      setMessages([]);
      setSelectedContact(contact);
      setSelectedConversationId(conversationId);
    } catch (cause) {
      setPanelError(cause instanceof Error ? cause.message : 'Unable to start a conversation.');
    } finally {
      setLoadingMessages(false);
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !selectedConversationId || sending) return;
    setSending(true);
    setPanelError('');
    try {
      await sendConversationMessage({ conversation_id: selectedConversationId, body });
      setDraft('');
      const result = await fetchConversationMessages(selectedConversationId) as { messages?: ChatMessage[] };
      const nextMessages = Array.isArray(result.messages) ? result.messages : [];
      setMessages(nextMessages);
      lastMarkedMessageId.current = nextMessages.reduce((latest, message) => Math.max(latest, message.id), 0);
      await refresh();
    } catch (cause) {
      setPanelError(cause instanceof Error ? cause.message : 'Unable to send this message.');
    } finally {
      setSending(false);
    }
  }

  function returnToList() {
    setSelectedConversationId(null);
    setSelectedContact(null);
    setMessages([]);
    setPanelError('');
  }

  if (/^\/(admin|lecturer|student)\/messages(?:\/|$)/.test(pathname)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] hidden md:block sm:bottom-6 sm:right-6">
      {open && <section
        role="dialog"
        aria-label={threadOpen ? `Chat with ${threadTitle}` : 'Quick messages'}
        className="mb-3 flex h-[min(560px,calc(100dvh-6rem))] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20"
      >
        <header className="relative overflow-hidden bg-slate-950 px-5 pb-4 pt-4 text-white">
          <div aria-hidden="true" className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-indigo-500/30 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {threadOpen && <button type="button" onClick={returnToList} aria-label="Back to conversations" className="mt-0.5 rounded-lg bg-white/10 p-1.5 transition hover:bg-white/20"><ArrowLeft size={16} /></button>}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-300">Rhema connect</p>
                <h2 className="mt-1 truncate text-lg font-black">{threadOpen ? threadTitle : 'Your conversations'}</h2>
                <p className="mt-1 text-xs text-slate-300">{threadOpen ? 'Send a message securely.' : 'Choose a conversation or find someone.'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close quick messages" className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20">
              <X size={17} />
            </button>
          </div>
          {!threadOpen && <label className="relative mt-4 block">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations or people"
              aria-label="Search conversations or people"
              className="w-full rounded-xl border border-white/10 bg-white/10 py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-400 focus:border-indigo-300"
            />
          </label>}
        </header>

        {threadOpen ? <>
          <div ref={messagePane} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-4">
            {loadingMessages && !messages.length && <p role="status" className="pt-8 text-center text-xs text-slate-500">Loading conversation…</p>}
            {messages.map((message) => {
              const isMine = message.sender_role.toLowerCase() === String(currentUser.role || '').toLowerCase()
                && [currentUser.id, currentUser.student_id].filter((id) => id != null).map(String).includes(String(message.sender_id));
              return <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <article className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${isMine ? 'rounded-br-md bg-indigo-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-900 shadow-sm'}`}>
                  {!isMine && <p className="mb-1 text-[10px] font-bold text-indigo-700">{message.sender_name}</p>}
                  <p className="whitespace-pre-wrap break-words text-xs leading-5">{message.body}</p>
                  <time className={`mt-1 block text-right text-[9px] ${message.pending ? 'text-amber-600' : isMine ? 'text-indigo-100' : 'text-slate-400'}`}>{message.pending ? 'Queued to send' : formatTime(message.created_at)}</time>
                </article>
              </div>;
            })}
            {!loadingMessages && !messages.length && <p className="pt-8 text-center text-xs text-slate-500">Start the conversation with a message.</p>}
          </div>
          {panelError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">{panelError}</p>}
          <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t border-slate-100 bg-white p-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={5000}
              rows={2}
              aria-label="Write a message"
              placeholder="Write a message…"
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
              <Send size={16} />
            </button>
          </form>
        </> : <>
          <nav className="grid grid-cols-2 gap-1 border-b border-slate-100 bg-slate-50 p-2" aria-label="Quick message views">
            {([['inbox', 'Inbox'], ['people', 'People']] as const).map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {label}{tab === 'inbox' && snapshot.unread_messages > 0 ? ` · ${snapshot.unread_messages}` : ''}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {activeTab === 'inbox' && filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => void openConversation(conversation)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${conversation.conversation_type === 'group' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                  {conversation.conversation_type === 'group' ? <Users size={17} /> : getInitials(conversation.display_title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-900">{conversation.display_title}</span>
                    <time className="shrink-0 text-[9px] text-slate-400">{formatTime(conversation.last_message_at)}</time>
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">{conversation.last_message || 'Start a conversation'}</span>
                </span>
                {conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold text-white">{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</span>}
              </button>
            ))}
            {activeTab === 'people' && filteredContacts.map((contact) => (
              <button
                key={`${contact.role}:${contact.id}`}
                type="button"
                disabled={loadingMessages}
                onClick={() => void openContact(contact)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-xs font-black text-indigo-700">{getInitials(contact.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-slate-900">{contact.name}</span>
                  <span className="mt-1 block text-[10px] capitalize text-slate-500">{contact.role}</span>
                </span>
                <MessageCircle size={15} className="text-slate-400" />
              </button>
            ))}
            {contactsLoading && activeTab === 'people' && <p role="status" className="px-4 py-8 text-center text-xs text-slate-500">Loading people…</p>}
            {!contactsLoading && activeTab === 'people' && !filteredContacts.length && <p className="px-4 py-8 text-center text-xs text-slate-500">{search ? 'No people match your search.' : 'No people are available to chat.'}</p>}
            {activeTab === 'inbox' && !filteredConversations.length && <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><MessageCircle size={20} /></span>
              <p className="mt-3 text-xs font-bold text-slate-800">{error ? 'Messages are unavailable' : search ? 'No matches found' : 'No conversations yet'}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{error || (search ? 'Try a different name or message.' : 'Choose People above to start a conversation.')}</p>
              {error && <button type="button" onClick={() => void retry()} className="mt-3 text-xs font-bold text-indigo-700 hover:underline">Try again</button>}
            </div>}
          </div>
          {panelError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">{panelError}</p>}
        </>}

        {!threadOpen && <footer className="border-t border-slate-100 bg-slate-50 p-3">
          <Link href={`${rolePath}/messages`} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-indigo-700">
            Open full inbox <ArrowUpRight size={15} />
          </Link>
        </footer>}
      </section>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close quick chat' : 'Open quick chat'}
        aria-expanded={open}
        className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-indigo-600 text-white shadow-xl shadow-indigo-950/25 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && snapshot.unread_messages > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rose-600 px-1 text-[9px] font-bold text-white">{snapshot.unread_messages > 99 ? '99+' : snapshot.unread_messages}</span>}
      </button>
    </div>
  );
}
