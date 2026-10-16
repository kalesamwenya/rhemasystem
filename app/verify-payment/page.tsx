'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type VerifiedPayment = {
  student_name: string;
  student_id: string;
  cohort: string;
  paid_for: string;
  amount: number;
  currency: string;
  reference: string;
  gateway: string;
  gateway_transaction_id: string | null;
  created_at: string;
  status: 'verified';
};

type VerificationResponse = { data: VerifiedPayment };

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

export default function VerifyPaymentPage() {
  const [payment, setPayment] = useState<VerifiedPayment | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      queueMicrotask(() => {
        if (!active) return;
        setError('This receipt verification link is invalid.');
        setLoading(false);
      });
      return () => { active = false; };
    }

    api.students.verifyPaymentReceipt(token)
      .then((response) => {
        if (active) setPayment((response as VerificationResponse).data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to verify this payment receipt.');
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
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Rhema Bible School</p>
          <h1 className="mt-2 text-2xl font-black">Payment receipt verification</h1>
          <p className="mt-2 text-xs text-slate-300">Independent confirmation from the school student finance ledger.</p>
        </header>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Checking the payment record...</div>
        ) : payment ? (
          <div className="relative overflow-hidden p-7 sm:p-10">
            <div aria-hidden="true" className="pointer-events-none absolute right-0 top-24 -rotate-12 select-none text-7xl font-black tracking-widest text-emerald-900/[0.04]">VERIFIED</div>
            <div className="relative">
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div><p className="text-sm font-black uppercase tracking-wide">Payment verified</p><p className="mt-1 text-xs">This payment was confirmed and credited to the student account.</p></div>
              </div>
              <dl className="mt-7 divide-y divide-slate-100 text-sm">
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Student</dt><dd className="text-right font-bold text-slate-900">{payment.student_name}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Student ID</dt><dd className="font-mono font-bold text-slate-900">{payment.student_id}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Cohort</dt><dd className="font-bold text-slate-900">{payment.cohort}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Paid for</dt><dd className="max-w-[65%] text-right font-bold text-slate-900">{payment.paid_for}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Amount received</dt><dd className="text-right text-lg font-black text-emerald-700">{money(payment.amount, payment.currency)}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Payment date</dt><dd className="text-right font-semibold text-slate-900">{new Date(payment.created_at).toLocaleString()}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Receipt reference</dt><dd className="max-w-[65%] break-all text-right font-mono text-xs font-bold text-slate-900">{payment.reference}</dd></div>
                <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Payment provider</dt><dd className="text-right font-semibold text-slate-900">{payment.gateway}</dd></div>
              </dl>
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-[11px] leading-5 text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
                <p>Verification confirms the payment record held by Rhema Bible School. Keep the receipt reference for any payment enquiries.</p>
              </div>
            </div>
          </div>
        ) : (
          <div role="alert" className="flex min-h-52 items-center gap-3 p-7 text-sm text-red-800 sm:p-10">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error || 'This payment receipt could not be verified.'}</p>
          </div>
        )}
        <footer className="border-t border-slate-100 px-7 py-4 text-center text-[10px] text-slate-400 sm:px-10">Rhema Bible School · Official student finance verification</footer>
      </section>
    </main>
  );
}
