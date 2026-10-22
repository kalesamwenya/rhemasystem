export type FinanceBudget = {
  id: number;
  name: string;
  department: string;
  category: string;
  period_start: string;
  period_end: string;
  amount: string | number;
  currency: string;
  notes: string | null;
  status: 'active' | 'closed';
  committed_amount: string | number;
  pending_amount: string | number;
};

export type FinanceExpenditure = {
  id: number;
  budget_id: number | null;
  budget_name: string | null;
  category: string;
  description: string;
  vendor: string;
  expense_date: string;
  amount: string | number;
  currency: string;
  payment_method: string;
  reference: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  notes: string | null;
};

export const financeInputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-red-400 focus:bg-white';

export function formatFinanceMoney(amount: number | string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return `0.00 ${currency}`;
  try {
    return new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatFinanceTotals(items: Array<{ amount: number | string; currency: string }>): string {
  const totals = new Map<string, number>();
  items.forEach((item) => totals.set(item.currency, (totals.get(item.currency) || 0) + Number(item.amount)));
  if (!totals.size) return formatFinanceMoney(0, 'ZMW');
  return [...totals.entries()].map(([currency, amount]) => formatFinanceMoney(amount, currency)).join(' · ');
}

export function localDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
