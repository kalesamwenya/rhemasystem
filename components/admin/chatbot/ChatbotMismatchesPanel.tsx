'use client';

import { AlertTriangle, CircleHelp } from 'lucide-react';
import type { ChatbotDashboardData } from './types';
import { displayChatbotDate } from './types';

type Props = {
  conflicts: ChatbotDashboardData['conflicts'];
  unmatched: ChatbotDashboardData['unmatched'];
  onCreateResponse: (question: string) => void;
};

export default function ChatbotMismatchesPanel({ conflicts, unmatched, onCreateResponse }: Props) {
  return (
    <section className="space-y-6">
      <div><h2 className="text-lg font-black text-slate-950">Mismatch checker</h2><p className="mt-1 text-sm text-slate-600">Find shared keywords and questions that need a rule or a clearer reply. Equal-priority competing rules use the fallback answer rather than choosing silently.</p></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-black text-slate-900"><AlertTriangle size={16} className="text-amber-600" />Overlapping rule keywords ({conflicts.length})</h3>
          {conflicts.length ? <div className="mt-4 space-y-3">{conflicts.map((conflict, index) => <article key={`${conflict.first}-${conflict.second}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3"><p className="text-sm font-bold text-slate-800">{conflict.first} <span className="font-normal text-slate-500">and</span> {conflict.second}</p><p className="mt-1 text-xs text-slate-600">Shared: {conflict.keywords.join(', ')}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">{conflict.same_priority ? 'Same priority — ambiguous match uses fallback' : 'Priority decides which answer is returned'}</p></article>)}</div> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">No duplicate keywords among enabled rules.</p>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="flex items-center gap-2 font-black text-slate-900"><CircleHelp size={16} className="text-red-600" />Unanswered or ambiguous questions ({unmatched.length} recent)</h3>
          {unmatched.length ? <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto">{unmatched.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm text-slate-800">{item.user_text}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${item.match_status === 'ambiguous' ? 'bg-amber-100 text-amber-800' : 'bg-red-50 text-red-700'}`}>{item.match_status}</span></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-500">{item.page_path} · {displayChatbotDate(item.created_at)}</span><button type="button" onClick={() => onCreateResponse(item.user_text)} className="shrink-0 text-[11px] font-black text-red-700 hover:underline">Create response</button></div></article>)}</div> : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">No unanswered or ambiguous questions are currently recorded.</p>}
        </section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-black text-slate-900">Rule behavior</h3><ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600"><li>Matches are case-insensitive and require a full word or phrase.</li><li>When multiple keywords match, the rule with the highest priority and longest matched phrase is selected.</li><li>Equal top-ranked matches are logged as ambiguous and return the configured fallback.</li></ul></section>
    </section>
  );
}
