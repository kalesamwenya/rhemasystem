'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LifeBuoy, LoaderCircle, Search, Send, Ticket, UserRound } from 'lucide-react';
import { api } from '@/lib/api';

type TicketStatus = 'open' | 'in_review' | 'resolved';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type HelpDeskReply = { id: number; message: string; admin_name: string; created_at: string };
type HelpTicket = {
  id: number;
  requester_name: string;
  requester_email: string;
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  replies: HelpDeskReply[];
};
type TicketForm = {
  requester_name: string;
  requester_email: string;
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
};

const emptyForm: TicketForm = {
  requester_name: '',
  requester_email: '',
  category: 'General',
  subject: '',
  description: '',
  priority: 'medium',
};

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open',
  in_review: 'In Review',
  resolved: 'Resolved',
};

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function ticketLabel(id: number) {
  return `HD-${String(id).padStart(5, '0')}`;
}

export default function HelpDeskPage() {
  const [tickets, setTickets] = useState<HelpTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TicketForm>(emptyForm);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.helpDesk.list() as { data?: HelpTicket[] };
      if (!Array.isArray(response.data)) throw new Error('The help desk did not return a ticket list.');
      setTickets(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load help desk tickets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void loadTickets(); });
  }, [loadTickets]);

  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const searchable = `${ticket.requester_name} ${ticket.subject} ${ticket.category} ${ticket.id} ${ticket.description}`.toLowerCase();
    return matchesStatus && searchable.includes(search.trim().toLowerCase());
  }), [search, statusFilter, tickets]);

  const stats = {
    open: tickets.filter((ticket) => ticket.status === 'open').length,
    inReview: tickets.filter((ticket) => ticket.status === 'in_review').length,
    resolved: tickets.filter((ticket) => ticket.status === 'resolved').length,
    critical: tickets.filter((ticket) => ticket.priority === 'critical' && ticket.status !== 'resolved').length,
  };

  const createTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.helpDesk.create(form);
      setForm(emptyForm);
      setShowForm(false);
      setNotice('Help desk ticket created.');
      await loadTickets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create this help desk ticket.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: TicketStatus) => {
    setError('');
    setNotice('');
    try {
      await api.helpDesk.updateStatus(id, status);
      setNotice('Ticket status updated.');
      await loadTickets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to update ticket status.');
    }
  };

  const sendReply = async (event: FormEvent<HTMLFormElement>, id: number) => {
    event.preventDefault();
    const message = (replyDrafts[id] ?? '').trim();
    if (!message || saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.helpDesk.reply(id, message);
      setReplyDrafts((current) => ({ ...current, [id]: '' }));
      setNotice('Reply saved to the ticket history.');
      await loadTickets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the ticket reply.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Admin support</div>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-slate-900">Help Desk</h1>
          <p className="mt-1 text-sm text-slate-600">Track support requests and keep replies with each ticket.</p>
        </div>
        <button type="button" onClick={() => setShowForm((open) => !open)} className="inline-flex items-center gap-2 self-start rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800">
          <Ticket className="h-4 w-4" /> {showForm ? 'Cancel' : 'New incident'}
        </button>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{notice}</div>}

      {showForm && <form onSubmit={(event) => void createTicket(event)} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <h2 className="text-lg font-black text-slate-900 md:col-span-2">Create support ticket</h2>
        <label className="space-y-1 text-xs font-bold text-slate-700">Requester name<input required maxLength={160} value={form.requester_name} onChange={(event) => setForm({ ...form, requester_name: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500" /></label>
        <label className="space-y-1 text-xs font-bold text-slate-700">Requester email (optional)<input type="email" maxLength={254} value={form.requester_email} onChange={(event) => setForm({ ...form, requester_email: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500" /></label>
        <label className="space-y-1 text-xs font-bold text-slate-700">Category<input required maxLength={100} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500" /></label>
        <label className="space-y-1 text-xs font-bold text-slate-700">Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TicketPriority })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500">{(['low', 'medium', 'high', 'critical'] as const).map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)}</option>)}</select></label>
        <label className="space-y-1 text-xs font-bold text-slate-700 md:col-span-2">Subject<input required maxLength={200} value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500" /></label>
        <label className="space-y-1 text-xs font-bold text-slate-700 md:col-span-2">Description<textarea required maxLength={10000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-slate-500" /></label>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50 md:col-span-2">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Create ticket</button>
      </form>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Open', value: stats.open, tone: 'bg-amber-50 text-amber-700' },
          { label: 'In Review', value: stats.inReview, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Resolved', value: stats.resolved, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Critical', value: stats.critical, tone: 'bg-rose-50 text-rose-700' },
        ].map((card) => <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${card.tone}`}>{card.label}</div><div className="mt-4 text-2xl font-black text-slate-900">{card.value}</div></div>)}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 md:w-[360px]"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full border-0 bg-transparent text-sm outline-none" placeholder="Search tickets, requester or ID" /></div>
        <div className="flex flex-wrap items-center gap-2">{(['all', 'open', 'in_review', 'resolved'] as const).map((status) => <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${statusFilter === status ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`}>{status === 'all' ? 'All' : statusLabels[status]}</button>)}</div>
      </div>

      {loading && !tickets.length && <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />Loading tickets...</div>}
      {!loading && !error && !filteredTickets.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{tickets.length ? 'No tickets match your search.' : 'No help desk tickets yet. Create an incident to get started.'}</div>}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => {
          const isExpanded = expandedId === ticket.id;
          return <article key={ticket.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700"><LifeBuoy className="h-4 w-4" /></div>
                <div>
                  <div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{ticketLabel(ticket.id)}</span><span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${ticket.priority === 'critical' ? 'bg-rose-50 text-rose-700' : ticket.priority === 'high' ? 'bg-amber-50 text-amber-700' : ticket.priority === 'medium' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{ticket.priority}</span></div>
                  <h2 className="mt-1 text-lg font-black text-slate-900">{ticket.subject}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5" />{ticket.requester_name}</span>{ticket.requester_email && <a href={`mailto:${ticket.requester_email}`} className="hover:underline">{ticket.requester_email}</a>}<span>{ticket.category}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{formatDate(ticket.updated_at)}</span></div>
                  <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-6 text-slate-600">{ticket.description}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select aria-label={`Status for ${ticketLabel(ticket.id)}`} value={ticket.status} onChange={(event) => void updateStatus(ticket.id, event.target.value as TicketStatus)} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-bold text-slate-700 outline-none">{(Object.keys(statusLabels) as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select>
                <button type="button" onClick={() => setExpandedId(isExpanded ? null : ticket.id)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-700">{isExpanded ? 'Hide history' : `Replies (${ticket.replies.length})`}</button>
              </div>
            </div>
            {isExpanded && <div className="mt-4 border-t border-slate-100 pt-4">
              {ticket.replies.length > 0 ? <div className="mb-4 space-y-3">{ticket.replies.map((reply) => <div key={reply.id} className="rounded-xl bg-slate-50 p-3"><div className="flex flex-wrap justify-between gap-2 text-[11px] font-bold text-slate-600"><span>{reply.admin_name}</span><time>{formatDate(reply.created_at)}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-slate-700">{reply.message}</p></div>)}</div> : <p className="mb-4 text-sm text-slate-500">No replies have been recorded.</p>}
              <form onSubmit={(event) => void sendReply(event, ticket.id)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="flex-1 space-y-1 text-xs font-bold text-slate-600">Add internal reply<textarea required maxLength={10000} rows={2} value={replyDrafts[ticket.id] ?? ''} onChange={(event) => setReplyDrafts({ ...replyDrafts, [ticket.id]: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-slate-500" /></label>
                <button disabled={saving || !replyDrafts[ticket.id]?.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"><Send className="h-3.5 w-3.5" />Save reply</button>
              </form>
            </div>}
          </article>;
        })}
      </div>
    </main>
  );
}
