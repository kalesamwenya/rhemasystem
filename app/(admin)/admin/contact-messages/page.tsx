'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, LoaderCircle, RefreshCw, X } from 'lucide-react';
import ChatbotLeadsPanel from '@/components/admin/chatbot/ChatbotLeadsPanel';
import type { ChatbotLead } from '@/components/admin/chatbot/types';
import { api } from '@/lib/api';

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ChatbotLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.chatbot.contactMessages() as { data?: ChatbotLead[] };
      if (!Array.isArray(response.data)) throw new Error('The contact messages endpoint returned invalid data.');
      setMessages(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load website contact messages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadMessages(); });
  }, [loadMessages]);

  const updateStatus = async (id: number, status: ChatbotLead['status']) => {
    setError('');
    setNotice('');
    try {
      await api.chatbot.updateLead(id, status);
      setNotice('Contact message status updated.');
      await loadMessages();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the contact message.');
    }
  };

  const replyToContact = async (id: number, reply: string) => {
    setError('');
    setNotice('');
    try {
      await api.chatbot.replyToLead(id, reply);
      setNotice('Email reply sent and saved to the message history.');
      await loadMessages();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to email this reply.';
      setError(message);
      throw new Error(message);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 bg-slate-50/70 p-4 md:p-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Website inbox</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Contact messages</h1>
          <p className="mt-1 text-sm text-slate-600">Read submissions from the public contact form and reply to the sender by email.</p>
        </div>
        <button type="button" onClick={() => void loadMessages()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </header>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="ml-auto"><X size={16} /></button></div>}
      {loading && !messages.length && <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" />Loading contact messages...</div>}
      {!loading && !error && messages.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No website contact-form messages have been received.</div>}
      {(messages.length > 0 || loading) && <ChatbotLeadsPanel
        leads={messages}
        query={query}
        onQueryChange={setQuery}
        onStatusChange={(id, status) => void updateStatus(id, status)}
        onReply={replyToContact}
        heading="Public website contact form"
        description="Read messages sent through the public contact form. Replies are emailed to the sender and saved in the conversation history."
      />}
    </main>
  );
}
