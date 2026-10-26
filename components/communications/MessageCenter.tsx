'use client';

import { api } from '@/lib/api';
import { useCommunications, type CommunicationConversation } from './CommunicationProvider';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronDown, ChevronUp, FileText, Image as ImageIcon, MessageCircle, Mic, Pause, Paperclip, Play, Plus, RotateCw, Search, Send, SkipBack, SkipForward, Smile, Square, Users, X } from 'lucide-react';
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

function formatAudioTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(safeValue / 60)}:${String(safeValue % 60).padStart(2, '0')}`;
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;
  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'ig'));
  return parts.map((part, index) => part.toLowerCase() === trimmedQuery.toLowerCase()
    ? <mark key={`${index}-${part}`} className="rounded bg-rhema-accent/70 px-0.5 text-slate-950">{part}</mark>
    : part);
}

function VoiceNotePlayer({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const progress = duration > 0 ? currentTime / duration : 0;
  const waveform = Array.from({ length: 36 }, (_, index) =>
    20 + ((index * 17 + index * index * 7) % 65),
  );

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch((cause: unknown) => {
        console.error('Voice note playback failed.', cause);
      });
    } else {
      audio.pause();
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const end = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.min(end, Math.max(0, audio.currentTime + seconds));
  };

  const changePlaybackRate = () => {
    const nextRate = playbackRate >= 2 ? 1 : playbackRate + 0.5;
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  };

  return (
    <div className="mt-3 flex w-full max-w-sm items-center gap-3 rounded-2xl bg-slate-950/10 px-3 py-2.5">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(duration);
        }}
      >
        <source src={src} />
      </audio>
      <button
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? `Pause ${name}` : `Play ${name}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-indigo-700 shadow-sm transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold opacity-80">{formatAudioTime(currentTime)}</span>
          <span className="text-[11px] opacity-70">{formatAudioTime(duration)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={Math.min(currentTime, duration || 0)}
          aria-label={`Seek ${name}`}
          onChange={(event) => {
            const nextTime = Number(event.target.value);
            if (audioRef.current) audioRef.current.currentTime = nextTime;
            setCurrentTime(nextTime);
          }}
          className="mt-1.5 h-1.5 w-full cursor-pointer accent-indigo-600"
        />
        <div className="mt-1 flex h-4 items-center gap-[2px]" aria-hidden="true">
          {waveform.map((height, index) => (
            <span
              key={index}
              className={`w-1 flex-1 rounded-full ${index / waveform.length <= progress ? 'bg-indigo-500' : 'bg-current opacity-30'}`}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => skip(-5)} aria-label="Go back 5 seconds" title="Back 5 seconds" className="rounded-md p-1 text-current opacity-75 hover:opacity-100">
          <SkipBack size={16} />
        </button>
        <button type="button" onClick={changePlaybackRate} aria-label={`Playback speed ${playbackRate} times`} title="Change playback speed" className="min-w-8 rounded-md px-1 py-1 text-[11px] font-bold text-current hover:bg-white/20">
          {playbackRate}×
        </button>
        <button type="button" onClick={() => skip(5)} aria-label="Skip forward 5 seconds" title="Forward 5 seconds" className="rounded-md p-1 text-current opacity-75 hover:opacity-100">
          <SkipForward size={16} />
        </button>
      </div>
    </div>
  );
}

export default function MessageCenter() {
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
    if (typeof window === 'undefined') return null;
    const requestedId = Number(new URLSearchParams(window.location.search).get('conversation'));
    return requestedId > 0 ? requestedId : null;
  });
  const activeConversationId = useRef(selectedId);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageSearchResults, setMessageSearchResults] = useState<Message[]>([]);
  const [messageSearchTotal, setMessageSearchTotal] = useState(0);
  const [messageSearchOffset, setMessageSearchOffset] = useState(0);
  const [messageSearchLoading, setMessageSearchLoading] = useState(false);
  const [messageSearchError, setMessageSearchError] = useState('');
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingWaveform, setRecordingWaveform] = useState<number[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [chatFilter, setChatFilter] = useState<ChatFilter>('all');
  const [activeListTab, setActiveListTab] = useState<'inbox' | 'explore'>('inbox');
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupParticipantKeys, setGroupParticipantKeys] = useState<string[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
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
  const recordingAudioContext = useRef<AudioContext | null>(null);
  const recordingAnimationFrame = useRef<number | null>(null);
  const recordingTimer = useRef<number | null>(null);
  const recordingStartedAt = useRef(0);
  const lastWaveformUpdate = useRef(0);
  const messagePaneRef = useRef<HTMLDivElement>(null);
  const messageElements = useRef(new Map<number, HTMLDivElement>());
  const messageSearchRequest = useRef(0);
  const previousMessageCount = useRef(0);
  const recordedChunks = useRef<Blob[]>([]);
  const loadingAttachments = useRef(new Set<number>());
  const failedAttachments = useRef(new Set<number>());
  const cachedAttachmentUrls = useRef(new Map<number, string>());

  useEffect(() => {
    if (!imagePreviewUrl) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setImagePreviewUrl(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [imagePreviewUrl]);
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
    const matchesSearch = `${item.display_title} ${item.title || ''} ${item.direct_contact_key || ''} ${item.last_message || ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
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
  const chatListItems = useMemo<ChatListItem[]>(() => activeListTab === 'inbox'
    ? visibleConversations.map((conversation): ChatListItem => ({ kind: 'conversation', conversation }))
    : visibleContacts.map((contact): ChatListItem => ({ kind: 'contact', contact })),
  [activeListTab, visibleConversations, visibleContacts]);
  const messageSearchMatches = messageSearch.trim() ? messageSearchResults : [];
  const displayedMessages = messageSearch.trim() ? messageSearchResults : messages;
  const activeSearchMatch = messageSearchMatches.length
    ? messageSearchMatches[searchMatchIndex % messageSearchMatches.length]
    : null;
  const hasGlobalAdminGroup = visibleConversations.some((item) => item.title === 'Global Admins');
  const groupCandidates = uniqueContacts.filter((contact) =>
    contact.role !== 'student' || canChatWithStudents,
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
    if (!activeSearchMatch) return;
    messageElements.current.get(activeSearchMatch.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSearchMatch]);

  useEffect(() => {
    const query = messageSearch.trim();
    const conversationId = selectedId;
    if (!conversationId || query.length < 2) return;

    let active = true;
    const requestId = ++messageSearchRequest.current;
    const timer = window.setTimeout(() => {
      api.communications.searchMessages(conversationId, query, messageSearchOffset)
        .then((result: { messages?: Message[]; total?: number }) => {
          if (!active || requestId !== messageSearchRequest.current) return;
          setMessageSearchResults(Array.isArray(result.messages) ? result.messages : []);
          setMessageSearchTotal(Number(result.total) || 0);
          setMessageSearchError('');
        })
        .catch((cause: unknown) => {
          if (!active || requestId !== messageSearchRequest.current) return;
          setMessageSearchResults([]);
          setMessageSearchTotal(0);
          setMessageSearchError(cause instanceof Error ? cause.message : 'Unable to search this conversation.');
        })
        .finally(() => {
          if (active && requestId === messageSearchRequest.current) setMessageSearchLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [messageSearch, messageSearchOffset, selectedId]);

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
    displayedMessages.forEach((message) => {
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
  }, [displayedMessages]);

  function showSelectedChat() {
    setSidebarOpen(typeof window !== 'undefined' && window.innerWidth >= 768);
  }

  function selectConversation(conversationId: number | null) {
    activeConversationId.current = conversationId;
    setSelectedId(conversationId);
  }

  function clearMessageSearch() {
    setMessageSearch('');
    setMessageSearchResults([]);
    setMessageSearchTotal(0);
    setMessageSearchOffset(0);
    setMessageSearchLoading(false);
    setMessageSearchError('');
    setSearchMatchIndex(0);
  }

  function changeMessageSearch(value: string) {
    setMessageSearch(value);
    setMessageSearchResults([]);
    setMessageSearchTotal(0);
    setMessageSearchOffset(0);
    setMessageSearchError('');
    setSearchMatchIndex(0);
    setMessageSearchLoading(value.trim().length >= 2);
  }

  function moveSearchMatch(direction: number) {
    if (!messageSearchMatches.length) return;
    if (direction > 0) {
      if (searchMatchIndex + 1 < messageSearchMatches.length) {
        setSearchMatchIndex(searchMatchIndex + 1);
      } else if (messageSearchOffset + messageSearchMatches.length < messageSearchTotal) {
        setMessageSearchLoading(true);
        setMessageSearchOffset(messageSearchOffset + 100);
        setSearchMatchIndex(0);
      } else {
        setMessageSearchLoading(true);
        setMessageSearchOffset(0);
        setSearchMatchIndex(0);
      }
      return;
    }
    if (searchMatchIndex > 0) {
      setSearchMatchIndex(searchMatchIndex - 1);
    } else if (messageSearchOffset > 0) {
      const previousOffset = Math.max(0, messageSearchOffset - 100);
      setMessageSearchLoading(true);
      setMessageSearchOffset(previousOffset);
      setSearchMatchIndex(Math.min(99, messageSearchTotal - previousOffset - 1));
    } else if (messageSearchTotal > 0) {
      const lastOffset = Math.floor((messageSearchTotal - 1) / 100) * 100;
      setMessageSearchLoading(true);
      setMessageSearchOffset(lastOffset);
      setSearchMatchIndex(messageSearchTotal - lastOffset - 1);
    }
  }

  async function openContact(contact: Contact) {
    const key = `${contact.role}:${contact.id}`;
    setPageError('');
    const existing = conversationByContact.get(key);
    if (existing) {
      clearMessageSearch();
      setMessages([]);
      setSelectedContact(null);
      selectConversation(existing.id);
      showSelectedChat();
      return;
    }
    if (contact.role === 'student') {
      clearMessageSearch();
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
      clearMessageSearch();
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
      clearMessageSearch();
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

  async function createGroupConversation(event: React.FormEvent) {
    event.preventDefault();
    const selectedParticipants = groupCandidates
      .filter((contact) => groupParticipantKeys.includes(`${contact.role}:${contact.id}`))
      .map((contact) => ({ role: contact.role, id: contact.id }));
    if (!groupTitle.trim() || selectedParticipants.length < 2 || selectedParticipants.length > 19) {
      setPageError('Enter a group name and choose between two and nineteen participants.');
      return;
    }

    setGroupSaving(true);
    setPageError('');
    try {
      const result: { conversation_id?: number | string } = await api.communications.createConversation({
        title: groupTitle.trim(),
        participants: selectedParticipants,
      });
      const conversationId = Number(result.conversation_id);
      if (!Number.isInteger(conversationId) || conversationId < 1) {
        throw new Error('The group conversation could not be created.');
      }
      await refresh();
      clearMessageSearch();
      setMessages([]);
      setSelectedContact(null);
      selectConversation(conversationId);
      setGroupDialogOpen(false);
      setGroupTitle('');
      setGroupParticipantKeys([]);
      setActiveListTab('inbox');
      showSelectedChat();
    } catch (cause) {
      setPageError(cause instanceof Error ? cause.message : 'Unable to create the group conversation.');
    } finally {
      setGroupSaving(false);
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

  const stopRecordingVisualization = useCallback((updateState = true) => {
    if (recordingAnimationFrame.current !== null) {
      window.cancelAnimationFrame(recordingAnimationFrame.current);
      recordingAnimationFrame.current = null;
    }
    if (recordingTimer.current !== null) {
      window.clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    const context = recordingAudioContext.current;
    recordingAudioContext.current = null;
    if (context && context.state !== 'closed') {
      void context.close().catch((cause: unknown) => {
        console.error('Voice recording audio monitor could not be closed.', cause);
      });
    }
    if (updateState) setRecordingWaveform([]);
  }, []);

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
      const preferredType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(mediaStream, preferredType ? { mimeType: preferredType } : undefined);
      recordedChunks.current = [];
      setRecordingDuration(0);
      setRecordingWaveform([]);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: recorder.mimeType || preferredType || 'audio/webm' });
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
        if (mounted.current) setAttachment(new File([blob], `voice-note.${extension}`, { type: blob.type }));
        mediaStream.getTracks().forEach((track) => track.stop());
        stopRecordingVisualization(false);
        mediaRecorder.current = null;
        if (mounted.current) {
          setRecording(false);
          setRecordingDuration(0);
        }
      };
      try {
        const context = new AudioContext();
        recordingAudioContext.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        context.createMediaStreamSource(mediaStream).connect(analyser);
        const samples = new Uint8Array(analyser.frequencyBinCount);
        const updateWaveform = (timestamp: number) => {
          analyser.getByteFrequencyData(samples);
          if (timestamp - lastWaveformUpdate.current > 90) {
            const barCount = 36;
            setRecordingWaveform(Array.from({ length: barCount }, (_, index) => {
              const binIndex = Math.floor((index / barCount) * samples.length);
              return Math.max(8, Math.min(100, Math.round((samples[binIndex] / 255) * 100)));
            }));
            lastWaveformUpdate.current = timestamp;
          }
          recordingAnimationFrame.current = window.requestAnimationFrame(updateWaveform);
        };
        recordingAnimationFrame.current = window.requestAnimationFrame(updateWaveform);
      } catch (cause) {
        console.error('Live voice waveform could not be initialized.', cause);
      }
      mediaRecorder.current = recorder;
      recorder.start();
      recordingStartedAt.current = Date.now();
      recordingTimer.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartedAt.current) / 1000));
      }, 250);
      setRecording(true);
      setPageError('');
    } catch (cause) {
      stream?.getTracks().forEach((track) => track.stop());
      stopRecordingVisualization();
      mediaRecorder.current = null;
      setRecording(false);
      setPageError(cause instanceof Error ? `Unable to access the microphone: ${cause.message}` : 'Unable to access the microphone.');
    }
  }

  useEffect(() => () => {
    if (mediaRecorder.current?.state !== 'inactive') mediaRecorder.current?.stop();
    stopRecordingVisualization(false);
  }, [stopRecordingVisualization]);

  return (
    <>
    <section className="relative flex h-[min(78vh,900px)] min-h-[560px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
      <aside className={`h-full w-full shrink-0 flex-col border-slate-200 bg-white md:w-[280px] md:border-r ${sidebarOpen ? 'flex' : 'hidden md:flex'}`}>
        <div className="border-b border-slate-100 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Communications</p>
              <h1 className="mt-1 text-lg font-black tracking-tight text-slate-950">Messages</h1>
            </div>
            {isAdmin && (
              <select
                aria-label="Chat category"
                value={activeAdminTab}
                onChange={(event) => setActiveAdminTab(event.target.value as AdminChatTab)}
                className="min-w-0 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
              >
                {Object.entries(adminTabLabels)
                  .filter(([value]) => value !== 'student' || canChatWithStudents)
                  .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            )}
          </div>
          <label className="relative mt-4 block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people or messages" aria-label="Search chats or people" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" aria-label="Message views">
            {([
              ['inbox', 'Inbox', visibleConversations.length],
              ['explore', 'Explore', visibleContacts.length],
            ] as const).map(([tab, label, count]) => (
              <button
                key={tab}
                type="button"
                aria-pressed={activeListTab === tab}
                onClick={() => setActiveListTab(tab)}
                className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition ${activeListTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {label}
                {tab === 'inbox' && snapshot.unread_messages > 0 && <span className="rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] text-white">{snapshot.unread_messages > 99 ? '99+' : snapshot.unread_messages}</span>}
                {tab === 'explore' && <span className="text-[10px] opacity-70">{count}</span>}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button type="button" onClick={() => setChatFilter((current) => current === 'all' ? 'unread' : 'all')} aria-pressed={chatFilter === 'unread'} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition ${chatFilter === 'unread' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
              {chatFilter === 'unread' ? 'Showing unread' : 'Unread only'}
            </button>
            <button type="button" onClick={() => { setPageError(''); setGroupDialogOpen(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-indigo-700">
              <Plus size={13} /> New group
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isAdmin && activeAdminTab === 'global' && activeListTab === 'inbox' && !hasGlobalAdminGroup && (
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
              return <button key={`conversation:${conversation.id}`} type="button" onClick={() => { clearMessageSearch(); setMessages([]); setSelectedContact(null); selectConversation(conversation.id); showSelectedChat(); }} className={`flex w-full items-start gap-3 border-b border-slate-100 p-3.5 text-left transition hover:bg-slate-50 ${selectedId === conversation.id ? 'bg-indigo-50/80' : ''}`}>
                <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-bold ${conversation.conversation_type === 'group' ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm' : 'bg-indigo-100 text-indigo-800'}`}>{getInitials(conversation.display_title)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold text-slate-900">{conversation.display_title}</span>
                    {conversation.unread_count > 0 && <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span>}
                  </span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{conversation.last_message || 'No messages yet'}</span>
                  {conversation.last_message_at && <time className="mt-1 block text-[10px] text-slate-400">{formatTime(conversation.last_message_at)}</time>}
                </span>
              </button>;
            }
            const { contact } = item;
            const key = `${contact.role}:${contact.id}`;
            return <button key={`contact:${key}`} type="button" disabled={busyContact === key} onClick={() => void openContact(contact)} className={`flex w-full items-center gap-3 border-b border-slate-100 p-3.5 text-left transition hover:bg-slate-50 disabled:opacity-60 ${selectedContact?.role === contact.role && selectedContact.id === contact.id ? 'bg-indigo-50' : ''}`}>
            <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-bold text-slate-700">{getInitials(contact.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{contact.name}</span>
                <span className="mt-1 block truncate text-xs capitalize text-slate-500">{busyContact === key ? 'Opening chat…' : contact.role}</span>
              </span>
            </button>;
          })}
          {!chatListItems.length && !(isAdmin && activeAdminTab === 'global') && !contactsLoading && <p className="px-4 py-8 text-center text-xs text-slate-500">{chatFilter === 'unread' ? 'No unread conversations.' : activeListTab === 'explore' ? 'No people found.' : 'No conversations yet.'}</p>}
          {!chatListItems.length && contactsLoading && <p className="px-4 py-8 text-center text-xs text-slate-500">Loading chats…</p>}
        </div>
      </aside>

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${sidebarOpen ? 'hidden md:flex' : ''}`}>
        {selectedConversation || selectedContact ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5 sm:py-4">
              <button type="button" onClick={() => setSidebarOpen((open) => !open)} aria-label="Show chats" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Chats</button>
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-xs font-bold text-indigo-800">{getInitials(selectedConversation?.display_title || selectedContact?.name || '')}</span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-slate-900">{selectedConversation?.display_title || selectedContact?.name}</h2>
                <p className="text-xs capitalize text-slate-500">{selectedConversation ? `${selectedConversation.conversation_type} conversation` : `${selectedContact?.role || 'direct'} conversation`}</p>
              </div>
              <button type="button" onClick={() => setGroupDialogOpen(true)} aria-label="Create a group chat" title="Create a group chat" className="hidden rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-indigo-700 sm:block"><Users size={18} /></button>
            </div>
            {selectedConversation && <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
              <label className="relative min-w-[180px] flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={messageSearch}
                  maxLength={100}
                  onChange={(event) => changeMessageSearch(event.target.value)}
                  placeholder="Search this conversation"
                  aria-label="Search messages in this conversation"
                  aria-describedby="message-search-status"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-rhema-blue focus:ring-2 focus:ring-rhema-blue/10"
                />
              </label>
              <div id="message-search-status" className="min-w-[122px] text-center text-xs text-slate-600" aria-live="polite">
                {messageSearchLoading
                  ? 'Searching…'
                  : messageSearchError
                    ? 'Search failed'
                    : messageSearch.trim().length === 1
                      ? 'Enter 2+ characters'
                      : messageSearch.trim()
                        ? messageSearchMatches.length
                          ? `${messageSearchOffset + searchMatchIndex % messageSearchMatches.length + 1} of ${messageSearchTotal}`
                          : 'No matches'
                        : 'Search messages'}
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveSearchMatch(-1)} disabled={messageSearchLoading || messageSearchTotal < 2} aria-label="Previous message match" title="Previous match" className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-rhema-blue hover:text-rhema-blue disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronUp aria-hidden="true" size={16} />
                </button>
                <button type="button" onClick={() => moveSearchMatch(1)} disabled={messageSearchLoading || messageSearchTotal < 2} aria-label="Next message match" title="Next match" className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-rhema-blue hover:text-rhema-blue disabled:cursor-not-allowed disabled:opacity-40">
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
                {messageSearch && <button type="button" onClick={clearMessageSearch} aria-label="Clear message search" title="Clear search" className="rounded-md p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800">
                  <X aria-hidden="true" size={16} />
                </button>}
              </div>
            </div>}
            <div ref={messagePaneRef} className="flex-1 space-y-3 overflow-y-auto p-5">
              {displayedMessages.map((message) => {
                const isMine = isCurrentUserMessage(message);
                const attachmentUrl = message.attachment_id ? attachmentUrls[Number(message.attachment_id)] : undefined;
                return <div key={message.id} ref={(node) => {
                  if (node) messageElements.current.set(message.id, node);
                  else messageElements.current.delete(message.id);
                }} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <article className={`max-w-[85%] rounded-2xl px-4 py-3 transition-shadow ${isMine ? 'rounded-tl-md bg-indigo-600 text-white' : 'rounded-tr-md bg-slate-100 text-slate-900'} ${activeSearchMatch?.id === message.id ? 'ring-2 ring-rhema-blue ring-offset-2' : ''}`}>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold ${isMine ? 'text-white' : 'text-slate-800'}`}><HighlightedText text={message.sender_name || ''} query={messageSearch} /></span>
                      <span className={`text-[10px] capitalize ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}><HighlightedText text={message.sender_role || ''} query={messageSearch} /></span>
                      <time className={`text-[10px] ${isMine ? 'text-indigo-100' : 'text-slate-500'}`}>{formatTime(message.created_at)}</time>
                    </div>
                    <p className={`whitespace-pre-wrap break-words text-sm ${isMine ? 'text-white' : 'text-slate-900'}`}><HighlightedText text={message.body || ''} query={messageSearch} /></p>
                    {message.attachment_id && (
                      <div className="mt-2">
                        {message.attachment_name && message.attachment_type !== 'image' && <p className="mb-1 text-xs opacity-80"><HighlightedText text={message.attachment_name} query={messageSearch} /></p>}
                        {!attachmentUrl && <span className="text-xs">Loading attachment…</span>}
                        {attachmentUrl && message.attachment_type === 'image' && <button
                          type="button"
                          onClick={() => setImagePreviewUrl(attachmentUrl)}
                          aria-label="View shared image"
                          className="block cursor-zoom-in rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <Image src={attachmentUrl} alt="Shared image" width={640} height={480} unoptimized className="max-h-64 max-w-full rounded-lg object-contain" />
                        </button>}
                        {attachmentUrl && message.attachment_type === 'video' && <video controls preload="metadata" className="max-h-64 max-w-full rounded-lg"><source src={attachmentUrl} type={message.attachment_mime || undefined} /></video>}
                        {attachmentUrl && message.attachment_type === 'audio' && <VoiceNotePlayer src={attachmentUrl} name={message.attachment_name || 'Voice note'} />}
                        {attachmentUrl && message.attachment_type === 'file' && <a href={attachmentUrl} download={message.attachment_name || undefined} className={`text-sm underline ${isMine ? 'text-white' : 'text-indigo-800'}`}><HighlightedText text={message.attachment_name || 'Download attachment'} query={messageSearch} /></a>}
                      </div>
                    )}
                  </article>
                </div>;
              })}
              {!displayedMessages.length && messageSearch.trim() && !messageSearchLoading && !messageSearchError && messageSearch.trim().length >= 2 && <p className="text-center text-sm text-slate-500">No messages match “{messageSearch.trim()}”.</p>}
              {!displayedMessages.length && messageSearch.trim().length === 1 && <p className="text-center text-sm text-slate-500">Enter at least two characters to search messages.</p>}
              {!displayedMessages.length && messageSearchError && <p role="alert" className="text-center text-sm text-red-600">{messageSearchError}</p>}
              {!displayedMessages.length && messageSearchLoading && <p className="text-center text-sm text-slate-500">Searching this conversation…</p>}
              {!messages.length && !messageSearch.trim() && <p className="text-center text-sm text-slate-500">This conversation is ready. Send the first message.</p>}
            </div>
            <form onSubmit={(event) => void sendMessage(event)} className="border-t border-slate-100 p-3 sm:p-4">
              {recording && <div className="mb-3 flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-rose-700">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-600" />
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums">{formatAudioTime(recordingDuration)}</span>
                <div className="flex h-8 min-w-0 flex-1 items-center justify-center gap-[3px]" role="img" aria-label="Live microphone waveform">
                  {(recordingWaveform.length ? recordingWaveform : Array.from({ length: 36 }, () => 12)).map((height, index) => (
                    <span
                      key={index}
                      className="w-1 flex-1 max-w-[5px] rounded-full bg-rose-500 transition-[height] duration-100"
                      style={{ height: `${Math.max(10, height)}%` }}
                    />
                  ))}
                </div>
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide">Recording</span>
              </div>}
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
            {!sidebarOpen && <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Show chats</button>}
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
      {selectedConversation && <aside className="hidden h-full w-[260px] shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white xl:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Conversation details</h2>
        </div>
        <div className="border-b border-slate-100 px-5 py-6 text-center">
          <span aria-hidden="true" className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-black text-white shadow-lg shadow-indigo-200">
            {getInitials(selectedConversation.display_title)}
          </span>
          <h3 className="mt-3 font-bold text-slate-900">{selectedConversation.display_title}</h3>
          <p className="mt-1 text-xs capitalize text-slate-500">{selectedConversation.conversation_type} conversation</p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600">
              {selectedConversation.unread_count ? `${selectedConversation.unread_count} unread` : 'All caught up'}
            </span>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-[10px] font-semibold text-slate-600">
              {messages.length} messages
            </span>
          </div>
        </div>
        <div className="border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Shared images</h3>
            <span className="text-[10px] text-slate-400">{messages.filter((message) => message.attachment_type === 'image').length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {messages.filter((message) => message.attachment_type === 'image').slice(-6).map((message) => {
              const imageUrl = message.attachment_id ? attachmentUrls[Number(message.attachment_id)] : undefined;
              return <button
                key={message.id}
                type="button"
                disabled={!imageUrl}
                onClick={() => imageUrl && setImagePreviewUrl(imageUrl)}
                aria-label="View shared image"
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100 transition hover:opacity-80 disabled:opacity-50"
              >
                {imageUrl
                  ? <Image src={imageUrl} alt="Shared image" width={120} height={120} unoptimized className="h-full w-full object-cover" />
                  : <ImageIcon className="h-4 w-4 text-slate-400" />}
              </button>;
            })}
            {!messages.some((message) => message.attachment_type === 'image') && <p className="col-span-3 py-3 text-center text-[11px] text-slate-400">No shared images yet.</p>}
          </div>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800">Shared files</h3>
            <span className="text-[10px] text-slate-400">{messages.filter((message) => message.attachment_type === 'file').length}</span>
          </div>
          <div className="space-y-2">
            {messages.filter((message) => message.attachment_type === 'file').slice(-5).map((message) => {
              const fileUrl = message.attachment_id ? attachmentUrls[Number(message.attachment_id)] : undefined;
              return <div key={message.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500"><FileText size={15} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-semibold text-slate-700">{message.attachment_name || 'Shared file'}</p>
                  <time className="mt-0.5 block text-[9px] text-slate-400">{formatTime(message.created_at)}</time>
                </div>
                {fileUrl && <a href={fileUrl} download={message.attachment_name || undefined} aria-label={`Download ${message.attachment_name || 'shared file'}`} className="rounded-lg p-1.5 text-indigo-600 hover:bg-indigo-50"><ChevronDown size={14} /></a>}
              </div>;
            })}
            {!messages.some((message) => message.attachment_type === 'file') && <p className="py-3 text-center text-[11px] text-slate-400">No shared files yet.</p>}
          </div>
        </div>
      </aside>}
    </section>
    {groupDialogOpen && <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !groupSaving) setGroupDialogOpen(false);
      }}
    >
      <form onSubmit={(event) => void createGroupConversation(event)} role="dialog" aria-modal="true" aria-labelledby="new-group-title" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-600">Start together</p>
            <h2 id="new-group-title" className="mt-1 text-xl font-black text-slate-950">Create a group</h2>
          </div>
          <button type="button" onClick={() => setGroupDialogOpen(false)} disabled={groupSaving} aria-label="Close create group dialog" className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"><X size={18} /></button>
        </div>
        <div className="space-y-4 p-6">
          <label className="block text-xs font-bold text-slate-700">
            Group name
            <input value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} maxLength={180} required placeholder="e.g. Marketing Team" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />
          </label>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">Choose participants</h3>
              <span className="text-[10px] text-slate-400">{groupParticipantKeys.length} selected</span>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              {groupCandidates.map((contact) => {
                const key = `${contact.role}:${contact.id}`;
                const checked = groupParticipantKeys.includes(key);
                return <label key={key} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && groupParticipantKeys.length >= 19}
                    onChange={() => setGroupParticipantKeys((current) => checked ? current.filter((item) => item !== key) : [...current, key])}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-[10px] font-bold text-indigo-700">{getInitials(contact.name)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-800">{contact.name}</span>
                  <span className="text-[10px] capitalize text-slate-400">{contact.role}</span>
                </label>;
              })}
              {!groupCandidates.length && <p className="p-5 text-center text-xs text-slate-500">No eligible participants are available.</p>}
            </div>
          </div>
          {pageError && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{pageError}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button type="button" disabled={groupSaving} onClick={() => setGroupDialogOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={groupSaving || groupParticipantKeys.length < 2} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {groupSaving ? 'Creating…' : 'Create group'}
          </button>
        </div>
      </form>
    </div>}
    {imagePreviewUrl && <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/90 p-3 sm:p-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setImagePreviewUrl(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shared image preview"
        className="relative flex h-full w-full items-center justify-center"
      >
        <button
          type="button"
          onClick={() => setImagePreviewUrl(null)}
          aria-label="Close image preview"
          className="absolute right-0 top-0 z-10 rounded-full bg-white/10 p-3 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={22} />
        </button>
        <Image
          src={imagePreviewUrl}
          alt="Shared image"
          width={1920}
          height={1440}
          unoptimized
          className="max-h-[92vh] max-w-[94vw] rounded-lg object-contain"
        />
      </div>
    </div>}
    </>
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
