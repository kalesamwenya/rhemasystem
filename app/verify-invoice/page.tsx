'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type VerifiedInvoice = {
  reference: string;
  invoice_number: string;
  description: string;
  activity_name: string | null;
  amount: number;
  currency: string;
  issued_at: string;
  status: 'valid';
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export default function VerifyInvoicePage() {
  const [invoice, setInvoice] = useState<VerifiedInvoice | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const reference = new URLSearchParams(window.location.search).get('reference') || '';
    if (!reference || reference.length > 120) {
      queueMicrotask(() => {
        if (!active) return;
        setError('This invoice verification link is invalid.');
        setLoading(false);
      });
      return () => { active = false; };
    }

    api.students.verifyInvoice(reference)
      .then((response) => {
        if (active) setInvoice((response as { data: VerifiedInvoice }).data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to verify this invoice.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-950 px-7 py-7 text-white sm:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Emit Academy</p>
          <h1 className="mt-2 text-2xl font-black">Invoice verification</h1>
          <p className="mt-2 text-xs text-slate-300">Independent confirmation from the student finance ledger.</p>
        </header>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Checking the invoice record...</div>
        ) : invoice ? (
          <div className="relative overflow-hidden p-7 sm:p-10">
            <div className="relative">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div><p className="text-sm font-black uppercase tracking-wide">Invoice verified</p><p className="mt-1 text-xs">This invoice was issued and is recorded in the student finance ledger.</p></div>
              </div>
              <dl className="mt-7 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Invoice number</dt><dd className="text-right font-bold text-slate-900">{invoice.invoice_number}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Description</dt><dd className="max-w-[65%] text-right font-bold text-slate-900">{invoice.activity_name || invoice.description}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Amount invoiced</dt><dd className="text-right text-lg font-black text-blue-900">{money(invoice.amount, invoice.currency)}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Date issued</dt><dd className="text-right font-semibold text-slate-900">{new Date(invoice.issued_at).toLocaleDateString()}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Payment reference</dt><dd className="max-w-[65%] break-all text-right font-mono text-xs font-bold text-slate-900">{invoice.reference}</dd></div>
              </dl>
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-[11px] leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
                <p>This confirms the invoice record held by Emit Academy. It does not confirm that payment has been made.</p>
              </div>
            </div>
          </div>
        ) : (
          <div role="alert" className="flex min-h-52 items-center gap-3 p-7 text-sm text-red-800 sm:p-10">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error || 'This invoice could not be verified.'}</p>
          </div>
        )}
        <footer className="border-t border-slate-100 px-7 py-4 text-center text-[10px] text-slate-400 sm:px-10">Emit Academy · Official student finance verification</footer>
      </section>
    </main>
  );
}
