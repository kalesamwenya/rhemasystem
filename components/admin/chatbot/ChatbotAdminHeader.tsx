'use client';

import { Bot, RefreshCw } from 'lucide-react';

type Props = {
  loading: boolean;
  onRefresh: () => void;
};

export default function ChatbotAdminHeader({ loading, onRefresh }: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-red-700"><Bot size={15} /> Website tools</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Chatbot management</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Review visitor questions, manage keyword-based replies, find answer gaps, and follow up on enquiries.</p>
      </div>
      <button type="button" onClick={onRefresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh data</button>
    </header>
  );
}
