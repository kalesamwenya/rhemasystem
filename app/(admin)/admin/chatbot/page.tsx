'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import ChatbotAdminHeader from '@/components/admin/chatbot/ChatbotAdminHeader';
import ChatbotAdminTabs from '@/components/admin/chatbot/ChatbotAdminTabs';
import ChatbotLeadsPanel from '@/components/admin/chatbot/ChatbotLeadsPanel';
import ChatbotMismatchesPanel from '@/components/admin/chatbot/ChatbotMismatchesPanel';
import ChatbotOverview from '@/components/admin/chatbot/ChatbotOverview';
import ChatbotResponsesPanel from '@/components/admin/chatbot/ChatbotResponsesPanel';
import ChatbotSettingsPanel from '@/components/admin/chatbot/ChatbotSettingsPanel';
import {
  createChatbotIntentKey,
  EMPTY_CHATBOT_RESPONSE,
  type ChatbotDashboardData,
  type ChatbotLead,
  type ChatbotResponseForm,
  type ChatbotSettings,
  type ChatbotTab,
} from '@/components/admin/chatbot/types';
import { api } from '@/lib/api';

export default function ChatbotAdminPage() {
  const [tab, setTab] = useState<ChatbotTab>('overview');
  const [dashboard, setDashboard] = useState<ChatbotDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ChatbotResponseForm | null>(null);
  const [settings, setSettings] = useState<ChatbotSettings>({ school_address: '', map_url: '', fallback_response: '' });

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.chatbot.adminData() as { data?: ChatbotDashboardData };
      if (!response.data) throw new Error('The chatbot dashboard returned no data.');
      setDashboard(response.data);
      setSettings(response.data.settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load chatbot management data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadDashboard(); });
  }, [loadDashboard]);

  const saveResponse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.chatbot.saveResponse(editing);
      setEditing(null);
      setNotice('Chatbot response saved.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this chatbot response.');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.chatbot.saveSettings(settings);
      setNotice('Chatbot location and fallback response saved.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save chatbot settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateLead = async (id: number, status: ChatbotLead['status']) => {
    setError('');
    setNotice('');
    try {
      await api.chatbot.updateLead(id, status);
      setNotice('Lead follow-up status updated.');
      await loadDashboard();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update the lead.');
    }
  };

  const replyToLead = async (id: number, reply: string) => {
    setError('');
    setNotice('');
    try {
      await api.chatbot.replyToLead(id, reply);
      setNotice('Reply emailed to the contact and saved in the conversation.');
      await loadDashboard();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to email this reply.';
      setError(message);
      throw new Error(message);
    }
  };

  const startResponseFromQuestion = (question: string) => {
    const title = `Follow up: ${question.trim().slice(0, 70)}`;
    setEditing({
      ...EMPTY_CHATBOT_RESPONSE,
      intent_key: createChatbotIntentKey(title),
      title,
      keywords: question.replace(/,/g, ' ').trim(),
    });
    setTab('responses');
  };

  const changeTab = (nextTab: ChatbotTab) => {
    setTab(nextTab);
    setQuery('');
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] space-y-6 bg-slate-50/70 p-4 md:p-8">
      <ChatbotAdminHeader loading={loading} onRefresh={() => void loadDashboard()} />
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice('')} className="ml-auto"><X size={16} /></button></div>}
      <ChatbotAdminTabs activeTab={tab} onChange={changeTab} />
      {loading && !dashboard && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading chatbot statistics and data...</div>}
      {dashboard && tab === 'overview' && <ChatbotOverview dashboard={dashboard} />}
      {dashboard && tab === 'responses' && <ChatbotResponsesPanel
        responses={dashboard.responses}
        query={query}
        onQueryChange={setQuery}
        editing={editing}
        onEdit={setEditing}
        onSave={saveResponse}
        saving={saving}
      />}
      {dashboard && tab === 'mismatches' && <ChatbotMismatchesPanel
        conflicts={dashboard.conflicts}
        unmatched={dashboard.unmatched}
        onCreateResponse={startResponseFromQuestion}
      />}
      {dashboard && tab === 'leads' && <ChatbotLeadsPanel
        leads={dashboard.leads}
        query={query}
        onQueryChange={setQuery}
        onStatusChange={(id, status) => void updateLead(id, status)}
        onReply={replyToLead}
      />}
      {dashboard && tab === 'settings' && <ChatbotSettingsPanel
        settings={settings}
        saving={saving}
        onChange={setSettings}
        onSave={saveSettings}
      />}
    </main>
  );
}
