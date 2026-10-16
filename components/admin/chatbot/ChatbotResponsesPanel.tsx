'use client';

import { FormEvent } from 'react';
import { ExternalLink, Plus, Save, Search, X } from 'lucide-react';
import type { ChatbotResponse, ChatbotResponseForm } from './types';

type Props = {
  responses: ChatbotResponse[];
  query: string;
  onQueryChange: (query: string) => void;
  editing: ChatbotResponseForm | null;
  onEdit: (form: ChatbotResponseForm | null) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  saving: boolean;
};

const fieldClass = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900';

export default function ChatbotResponsesPanel({ responses, query, onQueryChange, editing, onEdit, onSave, saving }: Props) {
  const filterText = query.trim().toLowerCase();
  const filteredResponses = responses.filter((response) => (
    !filterText
    || response.title.toLowerCase().includes(filterText)
    || response.intent_key.toLowerCase().includes(filterText)
    || response.keywords.toLowerCase().includes(filterText)
  ));

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-black text-slate-950">Keywords and response library</h2><p className="mt-1 text-xs text-slate-500">Replies use the longest matching keyword; priority resolves cross-rule matches. Disable rules to preserve their history.</p></div>
        <button type="button" onClick={() => onEdit({ intent_key: '', title: '', keywords: '', response_text: '', action_label: '', action_url: '', priority: 0, enabled: true })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-black text-white hover:bg-red-600"><Plus size={15} /> Add response</button>
      </div>
      <div className="relative max-w-md"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search responses or keywords" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-400" /></div>
      {editing && <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">{editing.id ? 'Edit chatbot response' : 'Create chatbot response'}</h3><button type="button" onClick={() => onEdit(null)} aria-label="Close response form"><X size={18} /></button></div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-slate-600">Response title<input required maxLength={120} value={editing.title} onChange={(event) => onEdit({ ...editing, title: event.target.value })} className={fieldClass} /></label>
          <label className="space-y-1 text-xs font-bold text-slate-600">Unique intent key<input required pattern="[a-zA-Z0-9_-]{2,80}" value={editing.intent_key} onChange={(event) => onEdit({ ...editing, intent_key: event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })} placeholder="admissions" className={fieldClass} /></label>
          <label className="space-y-1 text-xs font-bold text-slate-600 md:col-span-2">Comma-separated keywords or phrases<textarea required maxLength={2000} value={editing.keywords} onChange={(event) => onEdit({ ...editing, keywords: event.target.value })} rows={2} placeholder="application, apply, enrolment" className={fieldClass} /></label>
          <label className="space-y-1 text-xs font-bold text-slate-600 md:col-span-2">Chatbot response<textarea required maxLength={4000} value={editing.response_text} onChange={(event) => onEdit({ ...editing, response_text: event.target.value })} rows={3} className={fieldClass} /></label>
          <label className="space-y-1 text-xs font-bold text-slate-600">Action button label <span className="font-normal">(optional)</span><input maxLength={100} value={editing.action_label} onChange={(event) => onEdit({ ...editing, action_label: event.target.value })} placeholder="Start an application" className={fieldClass} /></label>
          <label className="space-y-1 text-xs font-bold text-slate-600">Action destination<select value={editing.action_url} onChange={(event) => onEdit({ ...editing, action_url: event.target.value })} className={`${fieldClass} bg-white`}><option value="">No action</option><option value="/application">Application form</option><option value="/apply">Admissions information</option><option value="/contact">Contact page</option><option value="/events">Events and registration</option><option value="/offered-programs">Programs</option><option value="/fee-structure">Fee information</option></select></label>
          <label className="space-y-1 text-xs font-bold text-slate-600">Priority (-100 to 100)<input type="number" min={-100} max={100} value={editing.priority} onChange={(event) => onEdit({ ...editing, priority: Number(event.target.value) })} className={fieldClass} /></label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={editing.enabled} onChange={(event) => onEdit({ ...editing, enabled: event.target.checked })} /> Enabled on public chatbot</label>
        </div>
        <p className="text-[11px] text-slate-500">Choose both an action label and destination, or leave both empty. Priority breaks matches between different rules; same-priority collisions fall back to the safe default and appear in the mismatch checker.</p>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Save size={14} />{saving ? 'Saving...' : 'Save response'}</button>
      </form>}
      <div className="grid gap-4 lg:grid-cols-2">{filteredResponses.map((response) => <article key={response.id} className={`rounded-2xl border bg-white p-5 ${Boolean(response.enabled) ? 'border-slate-200' : 'border-slate-200 opacity-65'}`}>
        <div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-900">{response.title}</h3><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase ${Boolean(response.enabled) ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{Boolean(response.enabled) ? 'Enabled' : 'Disabled'}</span></div><p className="mt-1 text-[11px] text-slate-500">key: {response.intent_key} · priority {response.priority}</p></div><button type="button" onClick={() => onEdit({ ...response, enabled: Boolean(response.enabled) })} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50">Edit</button></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{response.keywords.split(',').map((keyword) => <span key={`${response.id}-${keyword}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-600">{keyword.trim()}</span>)}</div>
        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{response.response_text}</p>
        {response.action_label && <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-red-700">{response.action_label} <ExternalLink size={12} /></p>}
      </article>)}</div>
      {!filteredResponses.length && <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No matching responses. Add one to teach the chatbot a new answer.</p>}
    </section>
  );
}
