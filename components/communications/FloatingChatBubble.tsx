'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowUpRight, Image as ImageIcon, MessageCircle, Mic, Paperclip, Pause, Play, Search, Send, SkipBack, SkipForward, Smile, Square, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import EmojiPicker from 'emoji-picker-react';
import { fetchChatContacts, createChatConversation } from '@/lib/chat-api';
import {
  fetchMessageAttachment,
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
  attachment_id?: number | null;
  attachment_name?: string | null;
  attachment_mime?: string | null;
  attachment_type?: 'image' | 'video' | 'audio' | 'file' | null;
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

function formatAudioTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return `${Math.floor(safeValue / 60)}:${String(safeValue % 60).padStart(2, '0')}`;
}

function VoiceNotePlayer({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const progress = duration > 0 ? currentTime / duration : 0;
  const waveform = Array.from({ length: 28 }, (_, index) =>
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
    <div className="mt-2 flex w-[260px] max-w-full items-center gap-2 rounded-xl bg-slate-950/10 px-2 py-2">
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
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1 text-[9px] font-semibold tabular-nums">
          <span>{formatAudioTime(currentTime)}</span>
          <span className="opacity-70">{formatAudioTime(duration)}</span>
        </div>
        <div className="mt-1 flex h-4 items-center gap-[2px]" aria-hidden="true">
          {waveform.map((height, index) => (
            <span
              key={index}
              className={`w-1 flex-1 rounded-full ${index / waveform.length <= progress ? 'bg-blue-500' : 'bg-current opacity-30'}`}
              style={{ height: `${height}%` }}
            />
          ))}
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
          className="mt-1 h-1 w-full cursor-pointer accent-blue-600"
        />
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" onClick={() => skip(-5)} aria-label="Go back 5 seconds" title="Back 5 seconds" className="rounded-md p-1 text-current opacity-75 hover:opacity-100">
          <SkipBack size={13} />
        </button>
        <button type="button" onClick={changePlaybackRate} aria-label={`Playback speed ${playbackRate} times`} title="Change playback speed" className="min-w-7 rounded-md px-0.5 py-1 text-[9px] font-bold text-current hover:bg-white/20">
          {playbackRate}×
        </button>
        <button type="button" onClick={() => skip(5)} aria-label="Skip forward 5 seconds" title="Forward 5 seconds" className="rounded-md p-1 text-current opacity-75 hover:opacity-100">
          <SkipForward size={13} />
        </button>
      </div>
    </div>
  );
}

function attachmentAccepts(file: File) {
  return [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/aac',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain',
  ].includes(file.type);
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
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentUrls, setAttachmentUrls] = useState<Record<number, string>>({});
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isAtLatest, setIsAtLatest] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
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
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const recordedChunks = useRef<Blob[]>([]);
  const loadedAttachmentIds = useRef(new Set<number>());
  const cachedAttachmentUrls = useRef(new Map<number, string>());
  const mounted = useRef(true);
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
    mounted.current = true;
    const urlsToRevoke = cachedAttachmentUrls.current;
    return () => {
      mounted.current = false;
      if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') mediaRecorder.current.stop();
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      urlsToRevoke.forEach((url) => URL.revokeObjectURL(url));
      urlsToRevoke.clear();
    };
  }, []);

  useEffect(() => {
    messages.forEach((message) => {
      const attachmentId = Number(message.attachment_id);
      if (!attachmentId || loadedAttachmentIds.current.has(attachmentId)) return;
      loadedAttachmentIds.current.add(attachmentId);
      fetchMessageAttachment(attachmentId)
        .then((blob) => {
          if (!mounted.current) return;
          const url = URL.createObjectURL(blob);
          cachedAttachmentUrls.current.set(attachmentId, url);
          setAttachmentUrls((current) => ({ ...current, [attachmentId]: url }));
        })
        .catch((cause: unknown) => {
          loadedAttachmentIds.current.delete(attachmentId);
          if (mounted.current) setPanelError(cause instanceof Error ? cause.message : 'Unable to load a chat attachment.');
        });
    });
  }, [messages]);

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
    if (pane && isAtLatest) pane.scrollTop = pane.scrollHeight;
  }, [attachmentUrls, isAtLatest, messages.length, selectedConversationId]);

  function handleMessageScroll() {
    const pane = messagePane.current;
    if (!pane) return;
    setIsAtLatest(pane.scrollHeight - pane.scrollTop - pane.clientHeight < 40);
  }

  function scrollToLatest() {
    const pane = messagePane.current;
    if (!pane) return;
    pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
    setIsAtLatest(true);
  }

  async function openConversation(conversation: CommunicationConversation) {
    setPanelError('');
    setLoadingMessages(true);
    lastMarkedMessageId.current = 0;
    setMessages([]);
    setSelectedContact(null);
    setIsAtLatest(true);
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
      setIsAtLatest(true);
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
      setIsAtLatest(true);
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
    if ((!body && !attachment) || !selectedConversationId || sending) return;
    setSending(true);
    setPanelError('');
    try {
      await sendConversationMessage({ conversation_id: selectedConversationId, body, file: attachment });
      setDraft('');
      setAttachment(null);
      setShowEmojiPicker(false);
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

  async function toggleRecording() {
    if (recording) {
      mediaRecorder.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPanelError('Voice recording is not supported by this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStream.current = stream;
      const preferredType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recordedChunks.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunks.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: recorder.mimeType || preferredType || 'audio/webm' });
        const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'm4a' : 'webm';
        mediaStream.current?.getTracks().forEach((track) => track.stop());
        mediaStream.current = null;
        mediaRecorder.current = null;
        if (mounted.current && blob.size > 0) {
          setAttachment(new File([blob], `voice-note.${extension}`, { type: blob.type }));
          setPanelError('');
        }
        if (mounted.current) setRecording(false);
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
      setPanelError('');
    } catch (cause) {
      mediaStream.current?.getTracks().forEach((track) => track.stop());
      mediaStream.current = null;
      mediaRecorder.current = null;
      setRecording(false);
      setPanelError(cause instanceof Error ? `Unable to access the microphone: ${cause.message}` : 'Unable to access the microphone.');
    }
  }

  function returnToList() {
    setSelectedConversationId(null);
    setSelectedContact(null);
    setMessages([]);
    setIsAtLatest(true);
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
        <header className="relative overflow-hidden bg-blue-950 px-5 pb-4 pt-4 text-white">
          <div aria-hidden="true" className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-rhema-accent/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {threadOpen && <button type="button" onClick={returnToList} aria-label="Back to conversations" className="mt-0.5 rounded-lg bg-white/10 p-1.5 transition hover:bg-white/20"><ArrowLeft size={16} /></button>}
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-rhema-accent">Rhema connect</p>
                <h2 className="mt-1 truncate text-base font-bold">{threadOpen ? threadTitle : 'Your conversations'}</h2>
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
              className="w-full rounded-xl border border-white/10 bg-white/10 py-2.5 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-400 focus:border-rhema-accent"
            />
          </label>}
        </header>

        {threadOpen ? <>
          <div className="relative min-h-0 flex-1">
            <div ref={messagePane} onScroll={handleMessageScroll} className="absolute inset-0 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-4">
              {loadingMessages && !messages.length && <p role="status" className="pt-8 text-center text-xs text-slate-500">Loading conversation…</p>}
              {messages.map((message) => {
                const isMine = message.sender_role.toLowerCase() === String(currentUser.role || '').toLowerCase()
                  && [currentUser.id, currentUser.student_id].filter((id) => id != null).map(String).includes(String(message.sender_id));
                return <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <article className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 ${isMine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md border border-slate-100 bg-white text-slate-900 shadow-sm'}`}>
                    {!isMine && <p className="mb-1 text-[10px] font-bold text-blue-700">{message.sender_name}</p>}
                    {message.body && <p className="whitespace-pre-wrap break-words text-xs leading-5">{message.body}</p>}
                    {message.attachment_id && <div className="mt-2">
                      {!attachmentUrls[message.attachment_id] && <span className="text-[11px] opacity-80">Loading attachment…</span>}
                      {attachmentUrls[message.attachment_id] && message.attachment_type === 'image' && <Image
                        src={attachmentUrls[message.attachment_id]}
                        alt={message.attachment_name || 'Shared image'}
                        width={420}
                        height={320}
                        unoptimized
                        className="max-h-52 max-w-full rounded-lg object-contain"
                      />}
                      {attachmentUrls[message.attachment_id] && message.attachment_type === 'video' && <video controls preload="metadata" className="max-h-52 max-w-full rounded-lg"><source src={attachmentUrls[message.attachment_id]} type={message.attachment_mime || undefined} /></video>}
                      {attachmentUrls[message.attachment_id] && message.attachment_type === 'audio' && <VoiceNotePlayer src={attachmentUrls[message.attachment_id]} name={message.attachment_name || 'Voice note'} />}
                      {attachmentUrls[message.attachment_id] && message.attachment_type === 'file' && <a href={attachmentUrls[message.attachment_id]} download={message.attachment_name || undefined} className={`inline-flex items-center gap-1.5 text-xs underline ${isMine ? 'text-white' : 'text-blue-700'}`}><ImageIcon size={14} />{message.attachment_name || 'Download attachment'}</a>}
                    </div>}
                    <time className={`mt-1 block text-right text-[9px] ${message.pending ? 'text-amber-600' : isMine ? 'text-blue-100' : 'text-slate-400'}`}>{message.pending ? 'Queued to send' : formatTime(message.created_at)}</time>
                  </article>
                </div>;
              })}
              {!loadingMessages && !messages.length && <p className="pt-8 text-center text-xs text-slate-500">Start the conversation with a message.</p>}
            </div>
            {!isAtLatest && <button
              type="button"
              onClick={scrollToLatest}
              className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-blue-700 shadow-lg transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ArrowDown size={14} /> Scroll to latest
            </button>}
          </div>
          {panelError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">{panelError}</p>}
          <form onSubmit={(event) => void sendMessage(event)} className="border-t border-slate-100 bg-white p-3">
            {recording && <p role="status" className="mb-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />Recording voice note — select stop when finished.</p>}
            {attachment && <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600"><span className="truncate">{attachment.name}</span><button type="button" onClick={() => setAttachment(null)} className="shrink-0 font-semibold text-rose-600">Remove</button></div>}
            {showEmojiPicker && <div className="mb-2 max-w-full overflow-hidden rounded-lg border border-slate-200">
              <EmojiPicker
                width="100%"
                height={280}
                lazyLoadEmojis
                previewConfig={{ showPreview: false }}
                onEmojiClick={(emojiData) => {
                  setDraft((text) => `${text}${emojiData.emoji}`);
                  setShowEmojiPicker(false);
                }}
              />
            </div>}
            <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={5000}
              rows={2}
              aria-label="Write a message"
              placeholder="Write a message…"
              className="min-w-0 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            <div className="flex shrink-0 items-center gap-0.5">
              <button type="button" onClick={() => setShowEmojiPicker((shown) => !shown)} aria-label="Insert emoji" title="Insert emoji" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Smile size={16} /></button>
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach file or media" title="Attach file or media" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Paperclip size={16} /></button>
              <button type="button" onClick={() => void toggleRecording()} aria-label={recording ? 'Stop voice note' : 'Record voice note'} title={recording ? 'Stop voice note' : 'Record voice note'} className={`rounded-lg p-2 ${recording ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-600 hover:bg-slate-100'}`}>{recording ? <Square size={16} /> : <Mic size={16} />}</button>
              <button type="submit" disabled={(!draft.trim() && !attachment) || sending || recording} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rhema-red text-white transition hover:bg-rhema-red-dark disabled:cursor-not-allowed disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/wav,audio/aac,.pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (file && file.size > 25 * 1024 * 1024) {
                  setPanelError('Attachments must be smaller than 25 MB.');
                } else if (file && !attachmentAccepts(file)) {
                  setPanelError('This file type is not supported.');
                } else {
                  setAttachment(file);
                  setPanelError('');
                }
                event.target.value = '';
              }}
            />
            </div>
          </form>
        </> : <>
          <nav className="grid grid-cols-2 gap-1 border-b border-slate-100 bg-slate-50 p-2" aria-label="Quick message views">
            {([['inbox', 'Inbox'], ['people', 'People']] as const).map(([tab, label]) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)} aria-pressed={activeTab === tab} className={`rounded-xl px-3 py-2 text-xs font-bold transition ${activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
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
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${conversation.conversation_type === 'group' ? 'bg-gradient-to-br from-rhema-blue to-rhema-red text-white' : 'bg-blue-50 text-blue-700'}`}>
                  {conversation.conversation_type === 'group' ? <Users size={17} /> : getInitials(conversation.display_title)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-slate-900">{conversation.display_title}</span>
                    <time className="shrink-0 text-[9px] text-slate-400">{formatTime(conversation.last_message_at)}</time>
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-slate-500">{conversation.last_message || 'Start a conversation'}</span>
                </span>
                {conversation.unread_count > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white">{conversation.unread_count > 99 ? '99+' : conversation.unread_count}</span>}
              </button>
            ))}
            {activeTab === 'people' && filteredContacts.map((contact) => (
              <button
                key={`${contact.role}:${contact.id}`}
                type="button"
                disabled={loadingMessages}
                onClick={() => void openContact(contact)}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xs font-black text-blue-700">{getInitials(contact.name)}</span>
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
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><MessageCircle size={20} /></span>
              <p className="mt-3 text-xs font-bold text-slate-800">{error ? 'Messages are unavailable' : search ? 'No matches found' : 'No conversations yet'}</p>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">{error || (search ? 'Try a different name or message.' : 'Choose People above to start a conversation.')}</p>
              {error && <button type="button" onClick={() => void retry()} className="mt-3 text-xs font-bold text-blue-700 hover:underline">Try again</button>}
            </div>}
          </div>
          {panelError && <p role="alert" className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-[11px] text-rose-700">{panelError}</p>}
        </>}

        {!threadOpen && <footer className="border-t border-slate-100 bg-slate-50 p-3">
          <Link href={`${rolePath}/messages`} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-blue-700">
            Open full inbox <ArrowUpRight size={15} />
          </Link>
        </footer>}
      </section>}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? 'Close quick chat' : 'Open quick chat'}
        aria-expanded={open}
        className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-rhema-blue text-white shadow-xl shadow-rhema-blue/25 transition hover:-translate-y-0.5 hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rhema-blue"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && snapshot.unread_messages > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-rhema-red px-1 text-[9px] font-bold text-white">{snapshot.unread_messages > 99 ? '99+' : snapshot.unread_messages}</span>}
      </button>
    </div>
  );
}
