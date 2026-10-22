'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, CreditCard, Download, Eye, Loader2, RefreshCw, Wallet } from 'lucide-react';
import { api, uploadPdfDocument } from '@/lib/api';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';
import { createPaymentReceiptPdf, openPaymentReceiptBlob, uploadVerifiedStudentPaymentReceipt } from '@/lib/payment-receipt';

type BillingTransaction = {
  id: number;
  entry_type: 'charge' | 'payment';
  term: string;
  description: string;
  amount: number;
  currency: string;
  status: 'posted' | 'pending' | 'paid' | 'failed' | 'void';
  reference: string;
  gateway: string;
  gateway_transaction_id?: string | null;
  receipt_token?: string | null;
  receipt_path?: string | null;
  created_at: string;
  liability_type?: 'tuition' | 'missed_audio' | 'assignment' | 'quiz' | 'exam' | 'other_penalty' | null;
  liability_charge_id?: number | null;
  outstanding_amount?: number;
  pending_amount?: number;
};

type StudentBilling = {
  student: { student_id: string; name: string; cohort: string };
  currency: string;
  term: string;
  total_charges: number;
  total_paid: number;
  amount_due: number;
  liabilities_due: number;
  total_account_due: number;
  liabilities: BillingTransaction[];
  account_credit: number;
  tuition_configured: boolean;
  flutterwave_enabled: boolean;
  transactions: BillingTransaction[];
};

type BillingResponse = { data: StudentBilling };
type StudentActivityRequest = {
  id: number;
  activity_type: 'quiz' | 'exam' | 'assignment' | 'audio';
  activity_name: string;
  reason: string;
  status: 'pending_finance' | 'pending_it' | 'approved' | 'rejected';
  amount: number | null;
  currency: string | null;
  invoice_reference: string | null;
  created_at: string;
};

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

const liabilityLabel = (transaction: BillingTransaction) => {
  switch (transaction.liability_type) {
    case 'missed_audio': return 'Missed class audio';
    case 'assignment': return 'Missed assignment';
    case 'quiz': return 'Missed quiz';
    case 'exam': return 'Missed exam';
    case 'tuition': return 'Tuition / school fees';
    default: return transaction.entry_type === 'charge'
      ? (/tuition|school fees/i.test(transaction.description) ? 'Tuition / school fees' : 'Other charge')
      : 'Payment';
  }
};

export default function StudentBillingPage() {
  const [account, setAccount] = useState<StudentBilling | null>(null);
  const [activityRequests, setActivityRequests] = useState<StudentActivityRequest[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payingLiabilityId, setPayingLiabilityId] = useState<number | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receiptAction, setReceiptAction] = useState<{ id: number; mode: 'view' | 'download' } | null>(null);

  const loadBilling = useCallback(async () => {
    setError('');
    const [response, requestResponse] = await Promise.all([
      api.students.myBilling() as Promise<BillingResponse>,
      api.students.myActivityRequests() as Promise<{ data: StudentActivityRequest[] }>,
    ]);
    setAccount(response.data);
    setActivityRequests(requestResponse.data);
    return response.data;
  }, []);

  const uploadConfirmedReceipt = useCallback(async (reference: string, transactionId: string) => {
    await uploadVerifiedStudentPaymentReceipt(reference, transactionId);
    await loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [response, requestResponse] = await Promise.all([
          api.students.myBilling() as Promise<BillingResponse>,
          api.students.myActivityRequests() as Promise<{ data: StudentActivityRequest[] }>,
        ]);
        if (active) {
          setAccount(response.data);
          setActivityRequests(requestResponse.data);
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your student account.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(window.location.search);
    const transactionId = query.get('transaction_id');
    const reference = query.get('tx_ref');
    const paymentStatus = query.get('status');
    if (paymentStatus && paymentStatus !== 'successful' && !transactionId) {
      queueMicrotask(() => {
        if (!active) return;
        setNotice('Payment was not completed. No payment has been added to your account.');
        window.history.replaceState({}, '', window.location.pathname);
      });
      return () => { active = false; };
    }
    if (!transactionId || !reference) return () => { active = false; };

    queueMicrotask(() => {
      if (!active) return;
      setVerifying(true);
      setNotice('Confirming your Flutterwave payment securely...');
    });
    api.students.verifyMyPayment(transactionId, reference)
      .then(async (response: { message?: string }) => {
        if (!active) return;
        setNotice(response.message || 'Payment confirmed. Your account has been updated.');
        try {
          await uploadConfirmedReceipt(reference, transactionId);
          if (active) setNotice('Payment confirmed. Your branded receipt has been saved to your billing account.');
        } catch (reason) {
          if (active) setError(`Payment confirmed, but the receipt PDF could not be saved: ${reason instanceof Error ? reason.message : 'Please try again from your billing activity.'}`);
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setNotice('');
        setError(reason instanceof Error ? reason.message : 'We could not confirm this payment. Your account has not been credited.');
      })
      .finally(() => {
        if (!active) return;
        setVerifying(false);
        window.history.replaceState({}, '', window.location.pathname);
      });
    return () => { active = false; };
  }, [uploadConfirmedReceipt]);

  const startPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!account) return;
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > 100000000) {
      setError('Enter a payment amount greater than zero and within the transaction limit.');
      return;
    }

    setPaying(true);
    setError('');
    try {
      const response = await api.students.initiateMyPayment(paymentAmount) as { data: FlutterwaveInlineCheckout };
      await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
        const transactionId = String(transaction.transaction_id ?? '');
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
          setError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
          setPaying(false);
          return;
        }
        setVerifying(true);
        setNotice('Confirming your Flutterwave payment securely...');
        try {
          const verification = await api.students.verifyMyPayment(transactionId, response.data.reference) as { message?: string };
          setNotice(verification.message || 'Payment confirmed. Your account has been updated.');
          try {
            await uploadConfirmedReceipt(response.data.reference, transactionId);
            setNotice('Payment confirmed. Your branded receipt has been saved to your billing account.');
          } catch (reason) {
            setError(`Payment confirmed, but the receipt PDF could not be saved: ${reason instanceof Error ? reason.message : 'Please try again from your billing activity.'}`);
          }
        } catch (reason) {
          setNotice('');
          setError(reason instanceof Error ? reason.message : 'We could not confirm this payment. Your account has not been credited.');
        } finally {
          setVerifying(false);
          setPaying(false);
        }
      }, () => {
        setPaying(false);
        setNotice('Checkout closed. No payment was confirmed.');
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start your payment. Please try again.');
      setPaying(false);
    }
  };

  const payLiability = async (liability: BillingTransaction) => {
    if (!account || !liability.outstanding_amount || liability.outstanding_amount <= 0) return;
    setPayingLiabilityId(liability.id);
    setError('');
    setNotice('');
    try {
      const response = await api.students.initiateLiabilityPayment(liability.id) as { data: FlutterwaveInlineCheckout };
      await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
        const transactionId = String(transaction.transaction_id ?? '');
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
          setError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
          setPayingLiabilityId(null);
          return;
        }
        setVerifying(true);
        setNotice('Confirming your liability payment securely...');
        try {
          const verification = await api.students.verifyMyPayment(transactionId, response.data.reference) as { message?: string };
          setNotice(verification.message || 'Payment confirmed. The liability has been settled.');
          try {
            await uploadConfirmedReceipt(response.data.reference, transactionId);
            setNotice('Payment confirmed. The liability is settled and your receipt is saved.');
          } catch (reason) {
            setError(`Payment confirmed, but the receipt PDF could not be saved: ${reason instanceof Error ? reason.message : 'Please try again from your billing activity.'}`);
          }
        } catch (reason) {
          setNotice('');
          setError(reason instanceof Error ? reason.message : 'We could not confirm this payment. The liability remains outstanding.');
        } finally {
          setVerifying(false);
          setPayingLiabilityId(null);
        }
      }, () => {
        setPayingLiabilityId(null);
        setNotice('Checkout closed. No payment was confirmed.');
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start your liability payment.');
      setPayingLiabilityId(null);
    }
  };

  const handleReceipt = async (transaction: BillingTransaction, mode: 'view' | 'download') => {
    if (!account || transaction.status !== 'paid' || !transaction.receipt_token) {
      setError('A receipt is available only after a payment has been confirmed.');
      return;
    }

    setReceiptAction({ id: transaction.id, mode });
    setError('');
    let preview: Window | null = null;
    try {
      const paymentReceipt = {
        student_name: account.student.name,
        student_id: account.student.student_id,
        cohort: account.student.cohort,
        paid_for: transaction.description,
        term: transaction.term,
        amount: transaction.amount,
        currency: transaction.currency,
        reference: transaction.reference,
        gateway: transaction.gateway,
        gateway_transaction_id: transaction.gateway_transaction_id || null,
        created_at: transaction.created_at,
        receipt_token: transaction.receipt_token,
      };
      if (mode === 'view') {
        preview = window.open('about:blank', '_blank');
        if (!preview) throw new Error('Allow pop-ups to open the receipt preview.');
      }
      const pdf = await createPaymentReceiptPdf(paymentReceipt);
      if (preview) {
        const url = URL.createObjectURL(pdf);
        preview.location.replace(url);
        window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
      } else {
        openPaymentReceiptBlob(pdf, mode, transaction.reference);
      }
      if (!transaction.receipt_path) {
        try {
          await uploadPdfDocument(
            pdf,
            'receipts',
            `Rhema-Receipt-${transaction.reference.replace(/[^a-z0-9_-]/gi, '-')}.pdf`,
            transaction.reference,
            'receipt',
            transaction.gateway_transaction_id || '',
            'student',
          );
          await loadBilling();
        } catch (reason) {
          setError(`Receipt prepared, but could not be saved to the account: ${reason instanceof Error ? reason.message : 'Please try again.'}`);
        }
      }
    } catch (reason) {
      preview?.close();
      setError(reason instanceof Error ? reason.message : 'Unable to prepare or save your payment receipt. Please try again.');
    } finally {
      setReceiptAction(null);
    }
  };

  if (loading) {
    return <main className="mx-auto max-w-6xl"><div className="flex min-h-64 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading your student account...</div></main>;
  }

  return (
    <main className="mx-auto max-w-8xl space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-900">Student account</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Billing &amp; payments</h1>
          <p className="mt-1 text-sm text-slate-500">Review your charges and liabilities, outstanding balance, and payment history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <a href="#make-payment" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-900">
            <CreditCard className="h-4 w-4" /> Make payment
          </a>
          <button type="button" onClick={() => { setLoading(true); void loadBilling().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to refresh your account.')).finally(() => setLoading(false)); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh account
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      {account && <>
        <section className="overflow-hidden rounded-2xl bg-slate-950 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Tuition account · {account.term}</p>
              <h2 className="mt-2 text-xl font-black">{account.student.name}</h2>
              <p className="mt-1 text-xs font-medium text-slate-400">Student ID {account.student.student_id} · Cohort {account.student.cohort}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 md:min-w-64">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total account due</p>
              <p className="mt-1 text-3xl font-black text-white">{money(account.total_account_due, account.currency)}</p>
              <p className="mt-1 text-[11px] text-slate-400">Tuition {money(account.amount_due, account.currency)} · Other liabilities {money(account.liabilities_due, account.currency)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Account summary">
          {[
            { label: 'Total charges', amount: account.total_charges, icon: CreditCard, color: 'text-blue-900 bg-blue-50' },
            { label: 'Account payments', amount: account.total_paid, icon: ArrowDownLeft, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Outstanding liability', amount: account.amount_due, icon: ArrowUpRight, color: 'text-amber-700 bg-amber-50' },
            { label: 'Account credit', amount: account.account_credit, icon: Wallet, color: 'text-violet-700 bg-violet-50' },
          ].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                <span className={`rounded-lg p-2 ${metric.color}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-4 text-2xl font-black tracking-tight text-slate-950">{money(metric.amount, account.currency)}</p>
            </article>;
          })}
        </section>

        <section id="make-payment" className="scroll-mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-blue-50 p-3 text-blue-900"><CreditCard className="h-5 w-5" /></span>
              <div>
                <h2 className="text-base font-black text-slate-950">Make a payment</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">Pay all or part of your outstanding student account balance securely with Flutterwave.</p>
              </div>
            </div>
            {!account.tuition_configured ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">Tuition pricing has not been set for cohort {account.student.cohort}. Please contact the school office to update the fee settings.</p>
            ) : !account.flutterwave_enabled ? (
              <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">Flutterwave checkout is not configured on the server yet. Your balance is shown above; please contact the school office until online payments are enabled.</p>
            ) : (
              <form onSubmit={(event) => void startPayment(event)} className="mt-5 space-y-4">
                <p className="text-xs leading-5 text-slate-500">Pay part or all of your tuition, or make an additional payment. Any amount above tuition charges is recorded as account credit.</p>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Payment amount ({account.currency})</span>
                  <div className="mt-1 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-blue-900">
                    <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">{account.currency}</span>
                    <input type="number" required min="0.01" max="100000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder={account.amount_due > 0 ? account.amount_due.toFixed(2) : 'Enter an amount to add credit'} className="w-full px-3 py-3 text-sm font-semibold text-slate-900 outline-none" />
                  </div>
                </label>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {account.amount_due > 0 && <button type="button" onClick={() => setAmount(account.amount_due.toFixed(2))} className="text-xs font-bold text-blue-900 hover:underline">Pay tuition balance</button>}
                  <button type="submit" disabled={paying || verifying} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                    {paying || verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {paying ? 'Connecting to Flutterwave...' : 'Make payment'}
                  </button>
                </div>
                <p className="text-[10px] leading-4 text-slate-400">Your account is credited only after the payment provider confirms the transaction.</p>
              </form>
            )}
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-black text-slate-950">Account details</h2>
            <dl className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Student</dt><dd className="text-right font-bold text-slate-800">{account.student.name}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Student ID</dt><dd className="font-mono font-bold text-slate-800">{account.student.student_id}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Cohort</dt><dd className="font-bold text-slate-800">{account.student.cohort}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Current fee period</dt><dd className="font-bold text-slate-800">{account.term}</dd></div>
              <div className="flex justify-between gap-4 py-3"><dt className="text-slate-500">Payment provider</dt><dd className="font-bold text-slate-800">Flutterwave</dd></div>
            </dl>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-950">Other liabilities</h2><p className="mt-1 text-xs text-slate-500">Pay each invoice separately. Payment is marked settled only after Flutterwave verifies it.</p></div>
          {account.liabilities.length ? <div className="divide-y divide-slate-100">{account.liabilities.map((liability) => {
            const outstanding = liability.outstanding_amount || 0;
            const pending = liability.pending_amount || 0;
            const settled = outstanding <= 0;
            return <article key={liability.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-slate-900">{liability.description}</p><p className="mt-1 text-xs text-slate-500">{liabilityLabel(liability)} · {liability.term} · Invoice {liability.reference}</p><p className="mt-1 text-xs text-slate-600">Invoiced {money(liability.amount, liability.currency)} · Paid {money(liability.amount - outstanding, liability.currency)}</p></div>
              <div className="flex flex-wrap items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${settled ? 'bg-emerald-50 text-emerald-700' : pending > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{settled ? 'Paid & verified' : pending > 0 ? 'Payment pending' : 'Outstanding'}</span>{!settled && pending <= 0 && <button type="button" onClick={() => void payLiability(liability)} disabled={payingLiabilityId !== null || verifying} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-black text-white disabled:opacity-60">{payingLiabilityId === liability.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}{payingLiabilityId === liability.id ? 'Starting payment…' : `Pay now · ${money(outstanding, liability.currency)}`}</button>}</div>
            </article>;
          })}</div> : <p className="p-6 text-sm text-slate-500">No other outstanding liabilities.</p>}
        </section>

        {activityRequests.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-950">Activity access requests</h2><p className="mt-1 text-xs text-slate-500">Track Finance invoicing and IT access decisions.</p></div>
          <div className="divide-y divide-slate-100">{activityRequests.map((request) => <article key={request.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold text-slate-900">{request.activity_name}</p><p className="mt-1 text-xs text-slate-500">{request.activity_type} · Requested {new Date(request.created_at).toLocaleDateString()}{request.invoice_reference ? ` · Invoice ${request.invoice_reference}` : ''}</p>{request.amount !== null && <p className="mt-1 text-xs font-semibold text-slate-600">Invoice amount {money(request.amount, request.currency || account.currency)}</p>}</div>
            <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${request.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : request.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>{request.status.replace('_', ' ')}</span>
          </article>)}</div>
        </section>}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
            <div><h2 className="text-base font-black text-slate-950">Account activity</h2><p className="mt-1 text-xs text-slate-500">Your tuition, assessment, attendance-audio and other charges, plus confirmed payments.</p></div>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{account.transactions.length} records</span>
          </div>
          {account.transactions.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[790px] text-left">
              <thead><tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400"><th className="px-5 py-3">Description</th><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Date</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3 text-right">Receipt</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{account.transactions.map((transaction) => <tr key={transaction.id} className="text-xs">
                <td className="px-5 py-4"><p className="font-bold text-slate-800">{transaction.description}</p><p className="mt-1 text-[10px] text-slate-400">{transaction.entry_type === 'charge' ? `${liabilityLabel(transaction)} · ` : ''}{transaction.term}{transaction.gateway ? ` · ${transaction.gateway}` : ''}</p></td>
                <td className="px-5 py-4 font-mono text-[10px] text-slate-500">{transaction.reference}</td>
                <td className="px-5 py-4 text-slate-500">{new Date(transaction.created_at).toLocaleDateString()}</td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${transaction.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : transaction.status === 'pending' ? 'bg-amber-50 text-amber-800' : transaction.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{transaction.status}</span></td>
                <td className={`px-5 py-4 text-right font-black ${transaction.entry_type === 'payment' ? 'text-emerald-700' : 'text-slate-900'}`}>{transaction.entry_type === 'payment' ? '− ' : ''}{money(transaction.amount, transaction.currency)}</td>
                <td className="px-5 py-4 text-right">{transaction.entry_type === 'payment' && transaction.status === 'paid' && transaction.receipt_token ? <div className="inline-flex gap-1.5">
                  <button type="button" onClick={() => void handleReceipt(transaction, 'view')} disabled={receiptAction?.id === transaction.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60" aria-label={`View PDF receipt for ${transaction.reference}`}>{receiptAction?.id === transaction.id && receiptAction.mode === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />} View</button>
                  <button type="button" onClick={() => void handleReceipt(transaction, 'download')} disabled={receiptAction?.id === transaction.id} className="inline-flex items-center justify-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-[10px] font-black text-blue-900 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60" aria-label={`Download PDF receipt for ${transaction.reference}`}>{receiptAction?.id === transaction.id && receiptAction.mode === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} PDF</button>
                </div> : transaction.entry_type === 'payment' && transaction.status === 'pending' ? <span className="text-[10px] text-slate-400">After confirmation</span> : null}</td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="p-10 text-center"><Wallet className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No account activity yet</p><p className="mt-1 text-xs text-slate-500">Your charges and confirmed payments will appear here.</p></div>}
        </section>
      </>}
    </main>
  );
}
