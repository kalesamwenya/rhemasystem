'use client';

import { FormEvent, useState } from 'react';
import { ChevronDown, Search, Send } from 'lucide-react';
import type { ChatbotLead } from './types';
import { displayChatbotDate } from './types';

type Props = {
  leads: ChatbotLead[];
  query: string;
  onQueryChange: (query: string) => void;
  onStatusChange: (id: number, status: ChatbotLead['status']) => void;
  onReply: (id: number, reply: string) => Promise<void>;
  heading?: string;
  description?: string;
};

export default function ChatbotLeadsPanel({
  leads,
  query,
  onQueryChange,
  onStatusChange,
  onReply,
  heading = 'Contact form and chatbot enquiries',
  description = 'Read contact form messages and reply directly to the sender by email. Replies are saved here in the message history.',
}: Props) {
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyError, setReplyError] = useState('');
  const filterText = query.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => (
    !filterText
    || `${lead.name} ${lead.email} ${lead.phone} ${lead.enquiry} ${lead.source_action}`.toLowerCase().includes(filterText)
  ));

  const submitReply = async (event: FormEvent<HTMLFormElement>, lead: ChatbotLead) => {
    event.preventDefault();
    const reply = (drafts[lead.id] ?? '').trim();
    if (!reply || replyingId !== null) return;
    setReplyError('');
    setReplyingId(lead.id);
    try {
      await onReply(lead.id, reply);
      setDrafts((current) => ({ ...current, [lead.id]: '' }));
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'The email reply could not be sent.');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div><h2 className="text-lg font-black text-slate-950">{heading}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>
      <div className="relative max-w-md"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Search name, email, or enquiry" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-400" /></div>
      {replyError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{replyError}</p>}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Enquiry &amp; reply history</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Follow-up status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filteredLeads.map((lead) => <tr key={lead.id} className="align-top"><td className="px-4 py-4"><p className="font-bold text-slate-900">{lead.name}</p><a className="mt-1 block text-xs text-red-700 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>{lead.phone && <a className="mt-1 block text-xs text-slate-600 hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a>}</td><td className="max-w-xl px-4 py-4"><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{lead.enquiry}</p><p className="mt-1 text-[10px] text-slate-400">{lead.page_path}</p>
              {!!lead.replies?.length && <div className="mt-4 space-y-2 border-l-2 border-slate-200 pl-3">{lead.replies.map((reply) => <div key={reply.id} className="rounded-lg bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[10px] font-bold text-slate-600">Reply from {reply.admin_name} · {displayChatbotDate(reply.created_at)}</p><span className={`text-[10px] font-bold capitalize ${reply.delivery_status === 'sent' ? 'text-emerald-700' : reply.delivery_status === 'failed' ? 'text-red-700' : 'text-amber-700'}`}>{reply.delivery_status}</span></div><p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-slate-700">{reply.reply_text}</p></div>)}</div>}
              {lead.source_action === 'contact' && <form onSubmit={(event) => void submitReply(event, lead)} className="mt-4 space-y-2"><label className="sr-only" htmlFor={`lead-reply-${lead.id}`}>Reply to {lead.name}</label><textarea id={`lead-reply-${lead.id}`} value={drafts[lead.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [lead.id]: event.target.value }))} maxLength={5000} rows={3} placeholder={`Write an email reply to ${lead.name}...`} className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-red-400" /><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-slate-400">Sent to {lead.email}</span><button type="submit" disabled={!drafts[lead.id]?.trim() || replyingId !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-50"><Send size={13} />{replyingId === lead.id ? 'Sending...' : 'Email reply'}</button></div></form>}</td><td className="px-4 py-4 text-xs capitalize text-slate-600">{lead.source_action === 'contact' ? 'Contact form' : lead.source_action}</td><td className="px-4 py-4 text-xs text-slate-500">{displayChatbotDate(lead.created_at)}</td><td className="px-4 py-4"><label className="sr-only" htmlFor={`lead-status-${lead.id}`}>Follow-up status for {lead.name}</label><div className="relative"><select id={`lead-status-${lead.id}`} value={lead.status} onChange={(event) => onStatusChange(lead.id, event.target.value as ChatbotLead['status'])} className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold capitalize text-slate-700"><option value="new">New</option><option value="contacted">Contacted</option><option value="closed">Closed</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2 top-2.5 text-slate-500" /></div></td></tr>)}</tbody>
        </table>
        {!filteredLeads.length && <p className="p-8 text-center text-sm text-slate-500">No chatbot enquiries found.</p>}
      </div>
      <p className="text-xs text-slate-500">Showing up to 250 most recent leads.</p>
    </section>
  );
}
