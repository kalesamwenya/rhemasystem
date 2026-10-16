'use client';

import { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, Clock3, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { financeInputClass, formatFinanceTotals, localDateString, type FinanceBudget, type FinanceExpenditure } from './types';

type ExpenditureDraft = {
  budget_id: string;
  category: string;
  description: string;
  vendor: string;
  expense_date: string;
  amount: string;
  currency: string;
  payment_method: string;
  reference: string;
  status: FinanceExpenditure['status'];
  notes: string;
};

const blankDraft = (): ExpenditureDraft => ({
  budget_id: '',
  category: '',
  description: '',
  vendor: '',
  expense_date: localDateString(),
  amount: '',
  currency: 'ZMW',
  payment_method: '',
  reference: '',
  status: 'pending',
  notes: '',
});

function isCollectionResponse<T>(value: unknown): value is { success: true; data: T[] } {
  return Boolean(value && typeof value === 'object'
    && (value as { success?: unknown }).success === true
    && Array.isArray((value as { data?: unknown }).data));
}

const statusTone: Record<FinanceExpenditure['status'], string> = {
  pending: 'bg-amber-50 text-amber-800',
  approved: 'bg-blue-50 text-blue-700',
  paid: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
};

export default function ExpendituresPage() {
  const [expenditures, setExpenditures] = useState<FinanceExpenditure[]>([]);
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FinanceExpenditure['status']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ExpenditureDraft>(blankDraft);
  const [saving, setSaving] = useState(false);

  async function loadRecords() {
    try {
      const [expenditureResponse, budgetResponse]: [unknown, unknown] = await Promise.all([
        api.finance.expenditures(),
        api.finance.budgets(),
      ]);
      if (!isCollectionResponse<FinanceExpenditure>(expenditureResponse)
        || !isCollectionResponse<FinanceBudget>(budgetResponse)) {
        throw new Error('The finance service returned an invalid response.');
      }
      setExpenditures(expenditureResponse.data);
      setBudgets(budgetResponse.data);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load expenditure records.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([api.finance.expenditures(), api.finance.budgets()])
      .then(([expenditureResponse, budgetResponse]: [unknown, unknown]) => {
        if (!isCollectionResponse<FinanceExpenditure>(expenditureResponse)
          || !isCollectionResponse<FinanceBudget>(budgetResponse)) {
          throw new Error('The finance service returned an invalid response.');
        }
        if (active) {
          setExpenditures(expenditureResponse.data);
          setBudgets(budgetResponse.data);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load expenditure records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenditures.filter((record) => (statusFilter === 'all' || record.status === statusFilter)
      && (!query || `${record.description} ${record.category} ${record.vendor} ${record.reference} ${record.budget_name || ''}`.toLowerCase().includes(query)));
  }, [expenditures, search, statusFilter]);

  const paidItems = expenditures.filter((record) => record.status === 'paid');
  const approvedItems = expenditures.filter((record) => record.status === 'approved' || record.status === 'paid');
  const pendingItems = expenditures.filter((record) => record.status === 'pending');
  const paidTotal = formatFinanceTotals(paidItems.map((record) => ({ amount: record.amount, currency: record.currency })));
  const approvedTotal = formatFinanceTotals(approvedItems.map((record) => ({ amount: record.amount, currency: record.currency })));
  const pendingTotal = formatFinanceTotals(pendingItems.map((record) => ({ amount: record.amount, currency: record.currency })));

  function openCreate() {
    setEditingId(null);
    setDraft(blankDraft());
    setModalOpen(true);
  }

  function openEdit(record: FinanceExpenditure) {
    setEditingId(record.id);
    setDraft({
      budget_id: record.budget_id ? String(record.budget_id) : '',
      category: record.category,
      description: record.description,
      vendor: record.vendor,
      expense_date: record.expense_date,
      amount: String(record.amount),
      currency: record.currency,
      payment_method: record.payment_method,
      reference: record.reference,
      status: record.status,
      notes: record.notes || '',
    });
    setModalOpen(true);
  }

  async function saveExpenditure(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.finance.saveExpenditure({
        ...draft,
        budget_id: draft.budget_id || null,
        amount: Number(draft.amount),
        ...(editingId ? { id: editingId } : {}),
      });
      setModalOpen(false);
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save expenditure.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpenditure(record: FinanceExpenditure) {
    if (!window.confirm(`Delete expenditure "${record.description}"?`)) return;
    setError('');
    try {
      await api.finance.removeExpenditure(record.id);
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete expenditure.');
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Finance</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Expenditures</h1><p className="mt-1 text-sm text-slate-500">Record, review, and track school expenses against approved budgets.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white"><Plus size={15} /> Record expenditure</button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric title="Paid expenditures" value={paidTotal} icon={<CheckCircle2 className="text-emerald-700" />} />
        <Metric title="Approved / paid" value={approvedTotal} icon={<Banknote className="text-blue-700" />} />
        <Metric title="Awaiting review" value={pendingTotal} icon={<Clock3 className="text-amber-700" />} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <label className="relative block min-w-52 flex-1 sm:max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search description, vendor, category" className={`${financeInputClass} pl-9`} /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select>
        </div>
        {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading expenditure records…</div> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500"><tr><th className="px-4 py-3">Date / description</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>{visibleRows.map((record) => <tr key={record.id} className="border-t border-slate-100">
                <td className="px-4 py-3"><p className="font-bold text-slate-900">{record.description}</p><p className="text-xs text-slate-500">{record.expense_date}{record.reference ? ` · Ref ${record.reference}` : ''}</p></td>
                <td className="px-4 py-3 text-slate-700">{record.category}</td><td className="px-4 py-3 text-slate-600">{record.vendor || '—'}</td><td className="px-4 py-3 text-slate-600">{record.budget_name || 'Unallocated'}</td>
                <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-900">{formatFinanceTotals([{ amount: record.amount, currency: record.currency }])}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone[record.status]}`}>{record.status}</span></td>
                <td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => openEdit(record)} aria-label={`Edit ${record.description}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button><button type="button" onClick={() => void deleteExpenditure(record)} aria-label={`Delete ${record.description}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></td>
              </tr>)}{visibleRows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">{expenditures.length ? 'No expenditure records match your filters.' : 'No expenditures have been recorded yet.'}</td></tr>}</tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveExpenditure} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Expenditure ledger</p><h2 className="mt-1 text-xl font-black text-slate-900">{editingId ? 'Edit expenditure' : 'Record expenditure'}</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close form" className="rounded-lg bg-slate-100 p-2"><X size={16} /></button></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Description"><input required maxLength={255} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={financeInputClass} /></Field><Field label="Category"><input required maxLength={100} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Utilities" className={financeInputClass} /></Field>
          <Field label="Amount"><input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={financeInputClass} /></Field><Field label="Currency"><select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} className={financeInputClass}><option value="ZMW">ZMW</option><option value="GHS">GHS</option><option value="USD">USD</option></select></Field>
          <Field label="Expense date"><input required type="date" value={draft.expense_date} onChange={(event) => setDraft({ ...draft, expense_date: event.target.value })} className={financeInputClass} /></Field><Field label="Vendor / payee"><input maxLength={180} value={draft.vendor} onChange={(event) => setDraft({ ...draft, vendor: event.target.value })} className={financeInputClass} /></Field>
          <Field label="Link to budget"><select value={draft.budget_id} onChange={(event) => { const budget = budgets.find((item) => String(item.id) === event.target.value); setDraft({ ...draft, budget_id: event.target.value, ...(budget ? { currency: budget.currency } : {}) }); }} className={financeInputClass}><option value="">No budget allocation</option>{budgets.filter((budget) => budget.status === 'active').map((budget) => <option key={budget.id} value={budget.id}>{budget.name} · {budget.category}</option>)}</select></Field>
          <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ExpenditureDraft['status'] })} className={financeInputClass}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="paid">Paid</option><option value="rejected">Rejected</option></select></Field>
          <Field label="Payment method"><input maxLength={60} value={draft.payment_method} onChange={(event) => setDraft({ ...draft, payment_method: event.target.value })} placeholder="Cash, bank transfer, mobile money…" className={financeInputClass} /></Field><Field label="Reference"><input maxLength={120} value={draft.reference} onChange={(event) => setDraft({ ...draft, reference: event.target.value })} className={financeInputClass} /></Field>
        </div>
        <Field label="Notes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} className={financeInputClass} /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving…' : 'Save expenditure'}</button></div>
      </form></div>}
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 text-2xl font-black text-slate-900">{value}</p></article>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<span className="mt-1.5 block">{children}</span></label>;
}
