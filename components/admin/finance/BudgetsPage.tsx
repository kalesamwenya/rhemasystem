'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';
import { useEffect, useMemo, useState } from 'react';
import { Banknote, CalendarDays, Loader2, Pencil, Plus, Search, Trash2, Wallet, X } from 'lucide-react';
import { api } from '@/lib/api';
import { financeInputClass, formatFinanceMoney, formatFinanceTotals, localDateString, type FinanceBudget } from './types';

type BudgetDraft = {
  name: string;
  category: string;
  period_start: string;
  period_end: string;
  amount: string;
  currency: string;
  notes: string;
  status: FinanceBudget['status'];
};

const blankDraft = (): BudgetDraft => {
  const today = localDateString();
  return { name: '', category: '', period_start: `${today.slice(0, 4)}-01-01`, period_end: `${today.slice(0, 4)}-12-31`, amount: '', currency: 'ZMW', notes: '', status: 'active' };
};

function isBudgetResponse(value: unknown): value is { success: true; data: FinanceBudget[] } {
  return Boolean(value && typeof value === 'object'
    && (value as { success?: unknown }).success === true
    && Array.isArray((value as { data?: unknown }).data));
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FinanceBudget['status']>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<BudgetDraft>(blankDraft);
  const [saving, setSaving] = useState(false);

  async function loadBudgets() {
    try {
      const response: unknown = await api.finance.budgets();
      if (!isBudgetResponse(response)) throw new Error('The budget service returned an invalid response.');
      setBudgets(response.data);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load budgets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.finance.budgets()
      .then((response: unknown) => {
        if (!isBudgetResponse(response)) throw new Error('The budget service returned an invalid response.');
        if (active) setBudgets(response.data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load budgets.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleBudgets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return budgets.filter((budget) => (statusFilter === 'all' || budget.status === statusFilter)
      && (!query || `${budget.name} ${budget.category} ${budget.notes || ''}`.toLowerCase().includes(query)));
  }, [budgets, search, statusFilter]);
  const activeBudgets = budgets.filter((item) => item.status === 'active');
  const totalBudgeted = formatFinanceTotals(activeBudgets.map((item) => ({ amount: item.amount, currency: item.currency })));
  const committed = formatFinanceTotals(budgets.map((item) => ({ amount: item.committed_amount, currency: item.currency })));
  const remaining = formatFinanceTotals(activeBudgets.map((item) => ({ amount: Number(item.amount) - Number(item.committed_amount), currency: item.currency })));

  function openCreate() {
    setEditingId(null);
    setDraft(blankDraft());
    setModalOpen(true);
  }

  function openEdit(budget: FinanceBudget) {
    setEditingId(budget.id);
    setDraft({
      name: budget.name,
      category: budget.category,
      period_start: budget.period_start,
      period_end: budget.period_end,
      amount: String(budget.amount),
      currency: budget.currency,
      notes: budget.notes || '',
      status: budget.status,
    });
    setModalOpen(true);
  }

  async function saveBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.finance.saveBudget({ ...draft, amount: Number(draft.amount), ...(editingId ? { id: editingId } : {}) });
      setModalOpen(false);
      await loadBudgets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the budget.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteBudget(budget: FinanceBudget) {
    if (!(await confirmWithApp(`Delete budget "${budget.name}"? Linked expenditures will remain in the ledger.`, { title: 'Delete budget?', confirmText: 'Delete', tone: 'danger' }))) return;
    setError('');
    try {
      await api.finance.removeBudget(budget.id);
      await loadBudgets();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete the budget.');
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Finance</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Budgets</h1><p className="mt-1 text-sm text-slate-500">Plan allocations by category and track approved and paid expenditure against each budget.</p></div>
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white"><Plus size={15} /> Create budget</button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      <section className="grid gap-4 sm:grid-cols-3">
        <Metric title="Active budget allocation" value={totalBudgeted} icon={<Wallet className="text-blue-700" />} />
        <Metric title="Committed expenditure" value={committed} icon={<Banknote className="text-amber-700" />} />
        <Metric title="Remaining allocation" value={remaining} icon={<CalendarDays className="text-emerald-700" />} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <label className="relative block min-w-52 flex-1 sm:max-w-md"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search budgets or categories" className={`${financeInputClass} pl-9`} /></label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"><option value="all">All statuses</option><option value="active">Active</option><option value="closed">Closed</option></select>
        </div>
        {loading ? <LoadingState /> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500"><tr><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Period</th><th className="px-4 py-3">Allocated</th><th className="px-4 py-3">Committed</th><th className="px-4 py-3">Pending</th><th className="px-4 py-3">Remaining</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
              <tbody>{visibleBudgets.map((budget) => {
                const balance = Number(budget.amount) - Number(budget.committed_amount);
                return <tr key={budget.id} className="border-t border-slate-100">
                  <td className="px-4 py-3"><p className="font-bold text-slate-900">{budget.name}</p><p className="text-xs text-slate-500">{budget.category}</p></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">{budget.period_start} – {budget.period_end}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatFinanceMoney(budget.amount, budget.currency)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatFinanceMoney(budget.committed_amount, budget.currency)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-amber-700">{formatFinanceMoney(budget.pending_amount, budget.currency)}</td>
                  <td className={`whitespace-nowrap px-4 py-3 font-semibold ${balance < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatFinanceMoney(balance, budget.currency)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${budget.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{budget.status}</span></td>
                  <td className="whitespace-nowrap px-4 py-3"><button type="button" onClick={() => openEdit(budget)} aria-label={`Edit ${budget.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={15} /></button><button type="button" onClick={() => void deleteBudget(budget)} aria-label={`Delete ${budget.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 size={15} /></button></td>
                </tr>;
              })}{visibleBudgets.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">{budgets.length ? 'No budgets match your filters.' : 'No budgets yet. Create a budget to start planning finance allocations.'}</td></tr>}</tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveBudget} className="max-h-[92vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Budget record</p><h2 className="mt-1 text-xl font-black text-slate-900">{editingId ? 'Edit budget' : 'Create budget'}</h2></div><button type="button" onClick={() => setModalOpen(false)} aria-label="Close form" className="rounded-lg bg-slate-100 p-2"><X size={16} /></button></div>
        <Field label="Budget name"><input required maxLength={180} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={financeInputClass} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Category"><input required maxLength={100} value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="e.g. Operations" className={financeInputClass} /></Field><Field label="Allocation"><input required type="number" min="0.01" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={financeInputClass} /></Field></div>
        <div className="grid gap-4 sm:grid-cols-3"><Field label="Currency"><select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value })} className={financeInputClass}><option value="ZMW">ZMW</option><option value="GHS">GHS</option><option value="USD">USD</option></select></Field><Field label="Start date"><input required type="date" value={draft.period_start} onChange={(event) => setDraft({ ...draft, period_start: event.target.value })} className={financeInputClass} /></Field><Field label="End date"><input required type="date" min={draft.period_start} value={draft.period_end} onChange={(event) => setDraft({ ...draft, period_end: event.target.value })} className={financeInputClass} /></Field></div>
        <Field label="Status"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as BudgetDraft['status'] })} className={financeInputClass}><option value="active">Active</option><option value="closed">Closed</option></select></Field>
        <Field label="Notes"><textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={3} className={financeInputClass} /></Field>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</button><button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{saving && <Loader2 size={15} className="animate-spin" />}{saving ? 'Saving…' : 'Save budget'}</button></div>
      </form></div>}
    </div>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">{title}</p>{icon}</div><p className="mt-3 text-2xl font-black text-slate-900">{value}</p></article>;
}

function LoadingState() {
  return <div className="flex items-center justify-center gap-2 p-12 text-sm font-semibold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading budget records…</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<span className="mt-1.5 block">{children}</span></label>;
}
