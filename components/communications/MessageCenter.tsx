'use client';

import { api } from '@/lib/api';
import { useCommunications, type CommunicationConversation } from './CommunicationProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, MessageCircle, Mic, Paperclip, RotateCw, Search, Send, Smile, Square } from 'lucide-react';
import Image from 'next/image';
import EmojiPicker from 'emoji-picker-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Contact {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'lecturer' | 'student';
}

interface Message {
  id: number;
  sender_role: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  attachment_id?: number | null;
  attachment_path?: string | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_type?: 'image' | 'video' | 'audio' | 'file' | null;
}

interface CurrentUser {
  id?: string | number;
  student_id?: string | number;
  role?: string;
  admin_role?: string;
  department?: string;
}

type ChatListItem =
  | { kind: 'conversation'; conversation: CommunicationConversation }
  | { kind: 'contact'; contact: Contact };

type AdminChatTab = 'student' | 'lecturer' | 'admin' | 'global';
type ChatFilter = 'all' | 'unread';

function isStudentAffairsAdmin(user: CurrentUser) {
  if ((user.role || '').toLowerCase() !== 'admin') return false;
  const assignment = `${user.admin_role || ''} ${user.department || ''}`.toLowerCase().replace(/[_-]+/g, ' ');
  return /(^|[^a-z])student affairs([^a-z]|$)/.test(assignment);
}

function getInitials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
}

function formatTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function MessageCenter({ compact = false }: { compact?: boolean }) {
  const { snapshot, error, refresh, retry } = useCommunications();
  const [currentUser] = useState<CurrentUser>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(window.localStorage.getItem('rhema_user') || '{}') as CurrentUser;
    } catch {
      return {};
    }
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    if (compact || typeof window === 'undefined') return null;
    const requestedId = Number(new URLSearchParams(window.location.search).get('conversation'));
    return requestedId > 0 ? requestedId : null;
  });
  const activeConversationId = useRef(selectedId);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [activeAdminTab, setActiveAdminTab] = useState<AdminChatTab>(() =>
    isStudentAffairsAdmin(currentUser) ? 'student' : 'admin',
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyContact, setBusyContact] = useState<string | null>(null);
  const [busyGlobalGroup, setBusyGlobalGroup] = useState(false);
  const [pageError, setPageError] = useState('');
  const messagesLoading = useRef(false);
  const messagePollingFailures = useRef(0);
  const lastMarkedReadMessageId = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const messagePaneRef = useRef<HTMLDivElement>(null);
  const previousMessageCount = useRef(0);
  const recordedChunks = useRef<Blob[]>([]);
  const loadingAttachments = useRef(new Set<number>());
  const failedAttachments = useRef(new Set<number>());
  const cachedAttachmentUrls = useRef(new Map<number, string>());
  const mounted = useRef(true);
  const isAdmin = (currentUser.role || '').toLowerCase() === 'admin';
  const canChatWithStudents = isStudentAffairsAdmin(currentUser);
  const adminTabLabels: Record<AdminChatTab, string> = {
    student: 'Students',
    lecturer: 'Lecturers',
    admin: 'Admins',
    global: 'Global',
  };

  const conversations = useMemo(() => {
    const directContacts = new Set<string>();
    return snapshot.conversations.filter((conversation) => {
      if (conversation.conversation_type !== 'direct' || !conversation.direct_contact_key) return true;
      if (directContacts.has(conversation.direct_contact_key)) return false;
      directContacts.add(conversation.direct_contact_key);
      return true;
    });
  }, [snapshot.conversations]);
  const selectedConversation = conversations.find((item) => item.id === selectedId) || null;
  const conversationByContact = useMemo(() => new Map(
    conversations
      .filter((conversation): conversation is CommunicationConversation & { direct_contact_key: string } =>
        conversation.conversation_type === 'direct' && typeof conversation.direct_contact_key === 'string',
      )
      .map((conversation) => [conversation.direct_contact_key, conversation]),
  ), [conversations]);
  const filteredConversations = useMemo(() => conversations.filter((item) => {
    const matchesSearch = `${item.display_title} ${item.last_message || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch && (chatFilter === 'all' || item.unread_count > 0);
  }), [chatFilter, conversations, search]);
  const uniqueContacts = useMemo(() => {
    const unique = new Map<string, Contact>();
    contacts.forEach((contact) => unique.set(`${contact.role}:${contact.id}`, contact));
    return [...unique.values()];
  }, [contacts]);
  const filteredContacts = useMemo(
    () => chatFilter === 'unread' ? [] : uniqueContacts.filter((contact) =>
      !conversationByContact.has(`${contact.role}:${contact.id}`)
      && `${contact.name} ${contact.role} ${contact.email}`.toLowerCase().includes(search.trim().toLowerCase()),
    ),
    [chatFilter, uniqueContacts, conversationByContact, search],
  );
  const visibleConversations = useMemo(() => {
    if (!isAdmin) return filteredConversations;
    if (activeAdminTab === 'student' && !canChatWithStudents) return [];
    return filteredConversations.filter((conversation) => activeAdminTab === 'global'
      ? conversation.conversation_type === 'group'
      : conversation.direct_contact_key?.startsWith(`${activeAdminTab}:`));
  }, [activeAdminTab, canChatWithStudents, filteredConversations, isAdmin]);
  const visibleContacts = useMemo(() => isAdmin
    ? filteredContacts.filter((contact) => activeAdminTab !== 'global'
      && contact.role === activeAdminTab
      && (contact.role !== 'student' || canChatWithStudents))
    : filteredContacts, [activeAdminTab, canChatWithStudents, filteredContacts, isAdmin]);
  const chatListItems = useMemo<ChatListItem[]>(() => [
    ...visibleConversations.map((conversation): ChatListItem => ({ kind: 'conversation', conversation })),
    ...visibleContacts.map((contact): ChatListItem => ({ kind: 'contact', contact })),
  ], [visibleConversations, visibleContacts]);
  const hasGlobalAdminGroup = chatListItems.some(
    (item) => item.kind === 'conversation' && item.conversation.title === 'Global Admins',
  );
  const currentUserIds = new Set([currentUser.id, currentUser.student_id].filter((id) => id != null).map(String));
  const latestMessageId = messages[messages.length - 1]?.id;
  const isCurrentUserMessage = (message: Message) => {
    // Compare role case-insensitively and match sender id against known current user ids.
    const messageRole = (message.sender_role || '').toString().toLowerCase();
    const userRole = (currentUser.role || '').toString().toLowerCase();
    const senderIdStr = String(message.sender_id);
    return messageRole === userRole && currentUserIds.has(senderIdStr);
  };

  useEffect(() => {
    let active = true;
    api.communications.contacts()
      .then((result: { contacts?: Contact[] }) => {
        if (active) setContacts(Array.isArray(result.contacts) ? result.contacts : []);
      })
      .catch((cause: unknown) => {
        if (active) setPageError(cause instanceof Error ? cause.message : 'Unable to load available chats.');
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    if (messagesLoading.current) return;
    messagesLoading.current = true;
    try {
      const result: { messages?: Message[] } = await api.communications.messages(conversationId);
      if (activeConversationId.current !== conversationId) return;
      const nextMessages = Array.isArray(result.messages) ? result.messages : [];
      setMessages(nextMessages);
      messagePollingFailures.current = 0;
      const newestMessageId = nextMessages.reduce((latest, message) => Math.max(latest, message.id), 0);
      if (newestMessageId > lastMarkedReadMessageId.current) {
        await api.communications.markRead(conversationId);
        lastMarkedReadMessageId.current = newestMessageId;
        await refresh();
      }
      setPageError('');
    } catch (cause) {
      messagePollingFailures.current += 1;
      setPageError(cause instanceof Error ? cause.message : 'Unable to load this conversation.');
    } finally {
      messagesLoading.current = false;
    }
  }, [refresh]);

  useEffect(() => {
    activeConversationId.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const pane = messagePaneRef.current;
    if (!pane) return;
    const wasEmpty = previousMessageCount.current === 0;
    const isNearBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 120;
    if (wasEmpty || isNearBottom) pane.scrollTop = pane.scrollHeight;
    previousMessageCount.current = messages.length;
  }, [latestMessageId, messages.length, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    messagePollingFailures.current = 0;
    lastMarkedReadMessageId.current = 0;
    let timer: number;
    let active = true;
    const poll = async () => {
      if (!active) return;
      if (document.visibilityState === 'visible') {
        await loadMessages(selectedId);
      }
      const delay = messagePollingFailures.current
        ? Math.min(10000 * (2 ** Math.min(messagePollingFailures.current - 1, 5)), 300000)
        : 15000;
      timer = window.setTimeout(() => void poll(), delay);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || !active) return;
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
  }, [selectedId, loadMessages]);

  useEffect(() => {
    mounted.current = true;
    const attachmentUrlsToRevoke = cachedAttachmentUrls.current;
    return () => {
      mounted.current = false;
      attachmentUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
      attachmentUrlsToRevoke.clear();
    };
  }, []);

  useEffect(() => {
    messages.forEach((message) => {
      const attachmentId = Number(message.attachment_id);
      if (!attachmentId || cachedAttachmentUrls.current.has(attachmentId)
        || loadingAttachments.current.has(attachmentId) || failedAttachments.current.has(attachmentId)) return;
      loadingAttachments.current.add(attachmentId);
      api.communications.attachment(attachmentId)
        .then((blob: Blob) => {
          if (!mounted.current) return;
          const url = URL.createObjectURL(blob);
          cachedAttachmentUrls.current.set(attachmentId, url);
          setAttachmentUrls((current) => ({ ...current, [attachmentId]: url }));
        })
        .catch((cause: unknown) => {
          failedAttachments.current.add(attachmentId);
          if (mounted.current) setPageError(cause instanceof Error ? cause.message : 'Unable to load a chat attachment.');
        })
        .finally(() => loadingAttachments.current.delete(attachmentId));
    });
  }, [messages]);

  function showSelectedChat() {
    setSidebarOpen(!compact && typeof window !== 'undefined' && window.innerWidth >= 768);
  }

  function showCompactList() {
    setMessages([]);
    setSelectedContact(null);
    selectConversation(null);
    setSidebarOpen(true);
  }

  function selectConversation(conversationId: number | null) {
    activeConversationId.current = conversationId;
    setSelectedId(conversationId);
  }

  async function openContact(contact: Contact) {
    const key = `${contact.role}:${contact.id}`;
    setPageError('');
    const existing = conversationByContact.get(key);
    if (existing) {
      setMessages([]);
      setSelectedContact(null);
      selectConversation(existing.id);
      showSelectedChat();
      return;
    }
    if (contact.role === 'student') {
      setMessages([]);
      selectConversation(null);
      setSelectedContact(contact);
      showSelectedChat();
      return;
    }
    setBusyContact(key);
    try {
      const result: { conversation_id?: number | string } = await api.communications.createConversation({
        participants: [{ role: contact.role, id: contact.id }],
      });
      const conversationId = Number(result.conversation_id);
      if (!Number.isInteger(conversationId) || conversationId < 1) throw new Error('The chat could not be opened.');
      await refresh();
      setMessages([]);
      setSelectedContact(null);
      selectConversation(conversationId);
      showSelectedChat();
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Unable to open this chat.');
    } finally {
      setBusyContact(null);
    }
  }

  async function openGlobalAdminGroup() {
    setPageError('');
    setBusyGlobalGroup(true);
    try {
      const result: { conversation_id?: number | string } = await api.communications.globalAdminGroup();
      const conversationId = Number(result.conversation_id);
      if (!Number.isInteger(conversationId) || conversationId < 1) throw new Error('The global admin group could not be opened.');
      await refresh();
      setMessages([]);
      setSelectedContact(null);
      selectConversation(conversationId);
      showSelectedChat();
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Unable to open the global admin group.');
    } finally {
      setBusyGlobalGroup(false);
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if ((!body && !attachment) || (!selectedId && !selectedContact) || busy) return;
    setBusy(true);
    setPageError('');
    try {
      let conversationId = selectedId;
      if (!conversationId && selectedContact) {
        const result: { conversation_id?: number | string } = await api.communications.createConversation({
          participants: [{ role: selectedContact.role, id: selectedContact.id }],
        });
        conversationId = Number(result.conversation_id);
        if (!Number.isInteger(conversationId) || conversationId < 1) {
          throw new Error('The student chat could not be created.');
        }
        selectConversation(conversationId);
        setSelectedContact(null);
        await refresh();
      }
      if (!conversationId) throw new Error('Choose a chat before sending a message.');
      await api.communications.sendMessage({ conversation_id: conversationId, body, file: attachment });
      setDraft('');
      setAttachment(null);
      await loadMessages(conversationId);
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Unable to send your message.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPageError('Voice recording is not supported by this browser.');
      return;
    }
    let stream: MediaStream | null = null;
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream = mediaStream;
      const recorder = new MediaRecorder(mediaStream);
      recordedChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: recorder.mimeType || 'audio/webm' });
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
        setAttachment(new File([blob], `voice-note.${extension}`, { type: blob.type }));
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaRecorder.current = null;
        setRecording(false);
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
      setPageError('');
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      setPageError(cause instanceof Error ? `Unable to access the microphone: ${cause.message}` : 'Unable to access the microphone.');
    }
  }

  useEffect(() => () => {
    if (mediaRecorder.current?.state !== 'inactive') mediaRecorder.current?.stop();
  }, []);

  return (
    <section className={`flex overflow-hidden bg-white ${compact ? 'h-full min-h-0 flex-col rounded-none border-0 shadow-none sm:flex-row' : 'h-[calc(100dvh-9rem)] min-h-[420px] flex-col rounded-2xl border border-slate-200 shadow-sm md:h-[calc(100vh-150px)] md:flex-row'}`}>
      <aside className={`shrink-0 flex-col border-slate-200 ${compact
        ? `${selectedConversation || selectedContact ? 'hidden' : 'flex'} h-full min-h-0 w-full`
        : `${sidebarOpen ? 'flex' : 'hidden'} h-full min-h-0 w-full border-b md:h-auto md:w-80 md:border-b-0 md:border-r`}`}>
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-bold text-slate-900">Messages</h1>
            {isAdmin && (
              <select
                aria-label="Chat category"
                value={activeAdminTab}
                onChange={(event) => setActiveAdminTab(event.target.value as AdminChatTab)}
                className="min-w-0 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
              >
                {Object.entries(adminTabLabels)
                  .filter(([value]) => value !== 'student' || canChatWithStudents)
                  .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search conversations" className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
          <div className="mt-3 flex rounded-lg bg-slate-100 p-1" aria-label="Filter conversations">
            {([
              ['all', 'All chats', conversations.length],
              ['unread', 'Unread', conversations.filter((item) => item.unread_count > 0).length],
            ] as const).map(([filter, label, count]) => (
              <button
                key={filter}
                type="button"
                aria-pressed={chatFilter === filter}
                onClick={() => setChatFilter(filter)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition ${chatFilter === filter ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}<span className="text-[10px] opacity-70">{count}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!isAdmin && (
            <h2 className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Chats</h2>
          )}
          {isAdmin && activeAdminTab === 'global' && !hasGlobalAdminGroup && (
            <button
              type="button"
              disabled={busyGlobalGroup}
              onClick={() => void openGlobalAdminGroup()}
              className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">GA</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">Global Admins</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{busyGlobalGroup ? 'Opening group…' : 'Group chat for all admins'}</span>
              </span>
            </button>
          )}
          {chatListItems.map((item) => {
            if (item.kind === 'conversation') {
              const { conversation } = item;
              return <button key={`conversation:${conversation.id}`} type="button" onClick={() => { setMessages([]); setSelectedContact(null); selectConversation(conversation.id); showSelectedChat(); }} className={`flex w-full items-start gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 ${selectedId === conversation.id ? 'bg-indigo-50' : ''}`}>
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">{getInitials(conversation.display_title)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">{conversation.display_title}</span>
                    {conversation.unread_count > 0 && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{conversation.last_message || 'No messages yet'}</span>
                  {conversation.last_message_at && <time className="mt-1 block text-[10px] text-slate-400">{formatTime(conversation.last_message_at)}</time>}
                </span>
              </button>;
            }
            const { contact } = item;
            const key = `${contact.role}:${contact.id}`;
            return <button key={`contact:${key}`} type="button" disabled={busyContact === key} onClick={() => void openContact(contact)} className={`flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left hover:bg-slate-50 disabled:opacity-60 ${selectedContact?.role === contact.role && selectedContact.id === contact.id ? 'bg-indigo-50' : ''}`}>
              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">{getInitials(contact.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{contact.name}</span>
                <span className="mt-1 block truncate text-xs capitalize text-slate-500">{busyContact === key ? 'Opening chat…' : contact.role}</span>
              </span>
            </button>;
          })}
          {!chatListItems.length && !(isAdmin && activeAdminTab === 'global') && !contactsLoading && <p className="px-4 py-5 text-center text-xs text-slate-500">{chatFilter === 'unread' ? 'No unread conversations.' : 'No chats or people found.'}</p>}
          {!chatListItems.length && contactsLoading && <p className="px-4 py-5 text-center text-xs text-slate-500">Loading chats…</p>}
        </div>
        {compact && !selectedConversation && !selectedContact && (pageError || error) && <div role="alert" className="border-t border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">
          <p>{pageError || error}</p>
          {error && <button type="button" onClick={() => void retry()} className="mt-2 inline-flex items-center gap-1.5 font-bold text-red-800 hover:text-red-950">
            <RotateCw className="h-3 w-3" /> Retry communications
          </button>}
        </div>}
      </aside>

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${compact
        ? selectedConversation || selectedContact ? 'flex' : 'hidden'
        : sidebarOpen ? 'hidden md:flex' : ''}`}>
        {selectedConversation || selectedContact ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <button type="button" onClick={() => compact ? showCompactList() : setSidebarOpen((open) => !open)} aria-label={compact || !sidebarOpen ? 'Show chats' : 'Hide chats sidebar'} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">{compact ? 'People' : sidebarOpen ? 'Hide chats' : 'Chats'}</button>
              <div className="min-w-0">
                <h2 className="truncate font-bold text-slate-900">{selectedConversation?.display_title || selectedContact?.name}</h2>
                <p className="text-xs capitalize text-slate-500">{selectedConversation ? `${selectedConversation.conversation_type} conversation` : `${selectedContact?.role || 'direct'} conversation`}</p>
              </div>
            </div>
            <div ref={messagePaneRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((message) => {
                const isMine = isCurrentUserMessage(message);
                const attachmentUrl = message.attachment_id ? attachmentUrls[Number(message.attachment_id)] : undefined;
                return <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <article className={`max-w-[85%] rounded-2xl px-4 py-3 ${isMine ? 'rounded-tl-md bg-indigo-100 text-indigo-950' : 'rounded-tr-md bg-slate-800 text-white'}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold ${isMine ? 'text-indigo-900' : 'text-white'}`}>{message.sender_name}</span>
                      <span className={`text-[10px] capitalize ${isMine ? 'text-indigo-600' : 'text-slate-300'}`}>{message.sender_role}</span>
                      <time className={`text-[10px] ${isMine ? 'text-indigo-500' : 'text-slate-300'}`}>{formatTime(message.created_at)}</time>
                    </div>
                    <p className={`whitespace-pre-wrap break-words text-sm ${isMine ? 'text-indigo-950' : 'text-white'}`}>{message.body}</p>
                    {message.attachment_id && (
                      <div className="mt-2">
                        {!attachmentUrl && <span className="text-xs">Loading attachment…</span>}
                        {attachmentUrl && message.attachment_type === 'image' && <a href={attachmentUrl} target="_blank" rel="noreferrer"><Image src={attachmentUrl} alt={message.attachment_name || 'Shared image'} width={640} height={480} unoptimized className="max-h-64 max-w-full rounded-lg object-contain" /></a>}
                        {attachmentUrl && message.attachment_type === 'video' && <video controls preload="metadata" className="max-h-64 max-w-full rounded-lg"><source src={attachmentUrl} type={message.attachment_mime || undefined} /></video>}
                        {attachmentUrl && message.attachment_type === 'audio' && <audio controls preload="metadata" className="max-w-full"><source src={attachmentUrl} type={message.attachment_mime || undefined} /></audio>}
                        {attachmentUrl && message.attachment_type === 'file' && <a href={attachmentUrl} download={message.attachment_name || undefined} className={`text-sm underline ${isMine ? 'text-indigo-800' : 'text-white'}`}>{message.attachment_name || 'Download attachment'}</a>}
                      </div>
                    )}
                  </article>
                </div>;
              })}
              {!messages.length && <p className="text-center text-sm text-slate-500">This conversation is ready. Send the first message.</p>}
            </div>
            <form onSubmit={(event) => void sendMessage(event)} className="border-t border-slate-100 p-3 sm:p-4">
              {attachment && <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="truncate">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} className="shrink-0 font-semibold text-rose-600">Remove</button></div>}
                  {showEmojiPicker && <div className="mb-2 w-full max-w-full overflow-hidden rounded-lg border border-slate-200">
                    <EmojiPicker
                      width="100%"
                      height={300}
                      lazyLoadEmojis
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(emojiData) => {
                        setDraft((text) => `${text}${emojiData.emoji}`);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>}
              <div className="flex min-w-0 items-end gap-2">
                <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} rows={2} placeholder="Write a message..." className="min-w-0 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400" />
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => setShowEmojiPicker((shown) => !shown)} aria-label="Insert emoji" title="Insert emoji" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Smile className="h-4 w-4" /></button>
                  <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach media" title="Attach media" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Paperclip className="h-4 w-4" /></button>
                  <button type="button" onClick={() => void toggleRecording()} aria-label={recording ? 'Stop voice note' : 'Record voice note'} title={recording ? 'Stop recording' : 'Record voice note'} className={`rounded-lg p-2 ${recording ? 'text-rose-600' : 'text-slate-600 hover:bg-slate-100'}`}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</button>
                  <button type="submit" disabled={(!draft.trim() && !attachment) || busy} className="rounded-lg bg-indigo-600 p-2.5 text-white hover:bg-indigo-700 disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button>
                </div>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/aac,.pdf,.doc,.docx,.txt"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  if (file && file.size > 25 * 1024 * 1024) {
                    setPageError('Attachments must be smaller than 25 MB.');
                  } else {
                    setAttachment(file);
                    setPageError('');
                  }
                  event.target.value = '';
                }}
              />
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
            <MessageCircle className="h-10 w-10 text-slate-300" />
            {!compact && !sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Show chats</button>}
            <p className="font-semibold">Choose a chat or click a person to start one.</p>
          </div>
        )}
        {(pageError || error) && <div role="alert" className="flex items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">
          <p>{pageError || error}</p>
          {error && <button type="button" onClick={() => void retry()} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-red-800 hover:text-red-950">
            <RotateCw className="h-3 w-3" /> Retry
          </button>}
        </div>}
      </div>
    </section>
  );
}

export function CommunicationNotifications() {
  const { snapshot, loading, markNotificationRead, markAllNotificationsRead, error, retry } = useCommunications();
  const pathname = usePathname();
  const rolePath = pathname.startsWith('/admin') ? '/admin' : pathname.startsWith('/lecturer') ? '/lecturer' : '/student';
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const unreadCount = snapshot.notifications.filter((notification) => !notification.read_at).length;
  const visibleNotifications = snapshot.notifications.filter((notification) => {
    const matchesFilter = filter === 'all' || !notification.read_at;
    const matchesSearch = `${notification.title} ${notification.message} ${notification.type || ''}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Notifications</h1>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">{unreadCount} unread</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setMarkingAll(true);
              void markAllNotificationsRead().finally(() => setMarkingAll(false));
            }}
            disabled={!unreadCount || markingAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />{markingAll ? 'Marking read…' : 'Mark all read'}
          </button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-slate-400 focus-within:border-indigo-400">
            <Search className="h-4 w-4 shrink-0" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search notifications" placeholder="Search notifications" className="min-w-0 flex-1 py-2.5 text-sm text-slate-800 outline-none" />
          </label>
          <div className="flex rounded-lg bg-slate-100 p-1" aria-label="Filter notifications">
            {(['all', 'unread'] as const).map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === value ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {value === 'all' ? 'All' : `Unread${unreadCount ? ` (${unreadCount})` : ''}`}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <div role="alert" className="m-5 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={() => void retry()} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-red-800 hover:text-red-950">
          <RotateCw className="h-3 w-3" /> Retry
        </button>
      </div>}
      <div className="divide-y divide-slate-100">
        {visibleNotifications.map((notification, index) => (
          <article key={`${notification.source || 'communications'}:${notification.id}`} style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }} className={`rhema-notification-enter flex items-start gap-3 px-5 py-4 transition-colors sm:px-6 ${notification.read_at ? 'hover:bg-slate-50/70' : 'bg-indigo-50/60 hover:bg-indigo-50'}`}>
            <span aria-hidden="true" className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? 'bg-slate-200' : 'bg-indigo-600'}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="text-sm font-semibold text-slate-900">{notification.title}</h2>
                {notification.type && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{notification.type.replace(/[_-]+/g, ' ')}</span>}
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{notification.message}</p>
              <time className="mt-2 block text-xs text-slate-400">{formatTime(notification.created_at)}</time>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {!notification.read_at && <button type="button" onClick={() => void markNotificationRead(notification)} className="text-xs font-semibold text-indigo-700 hover:underline">Mark read</button>}
              {(notification.action_url || notification.conversation_id) && <Link href={notification.action_url || `${rolePath}/messages?conversation=${notification.conversation_id}`} onClick={() => { if (!notification.read_at) void markNotificationRead(notification); }} className="text-xs font-semibold text-indigo-700 hover:underline">Open</Link>}
            </div>
          </article>
        ))}
        {!visibleNotifications.length && <p role={loading ? 'status' : undefined} className="px-5 py-10 text-center text-sm text-slate-500">{loading ? 'Loading your notifications…' : filter === 'unread' && unreadCount === 0 ? 'You’re all caught up.' : 'No notifications match your search.'}</p>}
      </div>
    </section>
  );
}
