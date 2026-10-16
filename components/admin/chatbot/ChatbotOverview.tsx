'use client';

import { Check, CircleHelp, ExternalLink, MapPin, MessageSquareText, Send, Users } from 'lucide-react';
import type { ChatbotDashboardData } from './types';

type Props = { dashboard: ChatbotDashboardData };

export default function ChatbotOverview({ dashboard }: Props) {
  const metrics = dashboard.metrics;
  const matchRate = metrics.questions ? Math.round((metrics.matched / metrics.questions) * 100) : 0;
  const cards = [
    { label: 'Conversations', value: metrics.conversations, note: 'Unique visitors, 30 days', icon: Users },
    { label: 'Questions', value: metrics.questions, note: 'Incoming questions, 30 days', icon: MessageSquareText },
    { label: 'Matched', value: `${matchRate}%`, note: `${metrics.matched} answered by a rule`, icon: Check },
    { label: 'Needs review', value: metrics.unmatched + metrics.ambiguous, note: 'Unmatched or ambiguous', icon: CircleHelp },
    { label: 'Lead enquiries', value: dashboard.leads.length, note: 'Latest 250 submissions', icon: Send },
  ];

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-500">{label}</span><Icon size={17} className="text-red-600" /></div><p className="mt-3 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-[11px] text-slate-500">{note}</p></article>)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-black text-slate-900">Most asked questions <span className="text-xs font-medium text-slate-500">(30 days)</span></h2>
          {dashboard.top_questions.length ? <div className="mt-4 divide-y divide-slate-100">{dashboard.top_questions.map((item) => <div key={item.question} className="flex items-start justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm text-slate-800">{item.question}</p><span className={`mt-1 inline-block text-[10px] font-bold uppercase tracking-wide ${item.match_status === 'matched' ? 'text-emerald-700' : 'text-amber-700'}`}>{item.match_status}</span></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{item.count}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No questions have been recorded yet.</p>}
        </section>
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-slate-900">Most used responses <span className="text-xs font-medium text-slate-500">(30 days)</span></h2>
            {dashboard.top_responses.length ? <div className="mt-4 space-y-3">{dashboard.top_responses.map((item) => <div key={item.title} className="flex items-center justify-between gap-3"><span className="text-sm text-slate-700">{item.title}</span><span className="text-xs font-black text-slate-500">{item.count}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No configured responses have been used yet.</p>}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-black text-slate-900">Chatbot actions <span className="text-xs font-medium text-slate-500">(30 days)</span></h2>
            {dashboard.actions.length ? <div className="mt-4 space-y-3">{dashboard.actions.map((item) => <div key={`${item.action_label}-${item.action_target}`} className="flex items-center justify-between gap-3"><span className="truncate text-sm text-slate-700">{item.action_label} <span className="text-xs text-slate-400">{item.action_target}</span></span><span className="text-xs font-black text-slate-500">{item.count}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">No chatbot page actions have been recorded yet.</p>}
          </div>
        </section>
      </div>
      {dashboard.settings.school_address && <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><MapPin size={18} className="text-red-600" /><div className="min-w-0"><p className="text-xs font-black uppercase tracking-wide text-slate-500">Public school location</p><p className="mt-1 text-sm text-slate-800">{dashboard.settings.school_address}</p></div>{dashboard.settings.map_url && <a href={dashboard.settings.map_url} target="_blank" rel="noreferrer" className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-bold text-red-700">Map <ExternalLink size={13} /></a>}</div>}
    </section>
  );
}
