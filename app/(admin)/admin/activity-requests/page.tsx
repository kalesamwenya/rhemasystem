'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardList, Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';

type AccessRequest = {
  id: number;
  student_id: string;
  student_name: string;
  cohort: string;
  course_id: string;
  activity_type: 'quiz' | 'exam' | 'assignment' | 'audio';
  activity_id: number;
  activity_name: string;
  reason: string;
  review_note: string | null;
  status: 'pending_finance' | 'pending_it' | 'approved' | 'rejected';
  amount: number | null;
  currency: string | null;
  charge_id: number | null;
  invoice_reference: string | null;
  paid_amount: number;
  created_at: string;
};
type RequestResponse = {
  success: true;
  data: AccessRequest[];
  permissions: { finance: boolean; it: boolean };
};

function isRequestResponse(value: unknown): value is RequestResponse {
  return Boolean(value && typeof value === 'object'
    && (value as { success?: unknown }).success === true
    && Array.isArray((value as { data?: unknown }).data)
    && typeof (value as { permissions?: { finance?: unknown } }).permissions?.finance === 'boolean');
}

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export default function ActivityRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [canFinance, setCanFinance] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadRequests = useCallback(async () => {
    setError('');
    try {
      const response: unknown = await api.activityRequests.list();
      if (!isRequestResponse(response)) throw new Error('The activity request service returned an invalid response.');
      setRequests(response.data);
      setCanFinance(response.permissions.finance);
      setCanApprove(response.permissions.it);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load activity access requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void loadRequests(); });
    return () => { active = false; };
  }, [loadRequests]);

  async function updateRequest(request: AccessRequest, action: 'invoice' | 'approve' | 'reject') {
    setSavingId(request.id);
    setError('');
    setNotice('');
    try {
      const amount = invoiceAmounts[request.id];
      if (action === 'invoice' && (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
        throw new Error('Enter a positive invoice amount.');
      }
      const note = notes[request.id] || '';
      if (action === 'reject' && !note.trim()) throw new Error('Provide a reason when rejecting access.');
      const response = await api.activityRequests.save({
        request_id: request.id,
        action,
        ...(action === 'invoice' ? { amount: Number(amount) } : {}),
        ...(note ? { note } : {}),
      }) as { message?: string };
      setNotice(response.message || 'Request updated.');
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the request.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900">Student finance</p><h1 className="mt-1 text-3xl font-black text-slate-950">Activity access requests</h1><p className="mt-1 text-sm text-slate-500">Finance invoices student requests; IT reviews the access authorization.</p></div>
        <button type="button" onClick={() => { setLoading(true); void loadRequests(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"><RefreshCw size={15} /> Refresh</button>
      </header>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? <div className="flex justify-center p-12"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div> : requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center"><ClipboardList className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 font-bold text-slate-800">No requests to review</p></div>
      ) : <section className="space-y-4">{requests.map((request) => (
        <article key={request.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black text-slate-900">{request.activity_name}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-600">{request.activity_type}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{request.status.replace('_', ' ')}</span></div>
              <p className="mt-1 text-xs text-slate-500">{request.student_name} · {request.student_id} · {request.cohort} · {new Date(request.created_at).toLocaleString()}</p>
              <p className="mt-3 text-sm text-slate-700">{request.reason}</p>
              {request.charge_id && <p className="mt-2 text-xs font-semibold text-slate-600">Invoice {request.invoice_reference} · {formatMoney(request.amount || 0, request.currency || 'ZMW')} · Paid {formatMoney(request.paid_amount, request.currency || 'ZMW')}</p>}
              {request.review_note && <p className="mt-2 text-xs text-slate-500">Review note: {request.review_note}</p>}
            </div>
          </div>
          {canFinance && request.status === 'pending_finance' && <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Invoice amount<input type="number" min="0.01" max="100000000" step="0.01" value={invoiceAmounts[request.id] || ''} onChange={(event) => setInvoiceAmounts((current) => ({ ...current, [request.id]: event.target.value }))} className="mt-1 block w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" /></label>
            <button type="button" onClick={() => void updateRequest(request, 'invoice')} disabled={savingId === request.id} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60">{savingId === request.id && <Loader2 size={14} className="animate-spin" />}Issue invoice and send to IT</button>
          </div>}
          {canApprove && request.status === 'pending_it' && <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
            <label className="block min-w-64 flex-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Decision note (required to reject)<input value={notes[request.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [request.id]: event.target.value }))} className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-900" /></label>
            <button type="button" onClick={() => void updateRequest(request, 'approve')} disabled={savingId === request.id} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"><Check size={14} />Approve access</button>
            <button type="button" onClick={() => void updateRequest(request, 'reject')} disabled={savingId === request.id} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-xs font-black text-red-700 disabled:opacity-60"><X size={14} />Reject and void invoice</button>
          </div>}
        </article>
      ))}</section>}
      {!canFinance && !canApprove && <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Your account can view requests but cannot invoice or approve them.</p>}
    </main>
  );
}
