'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowDownLeft, ArrowUpRight, CheckCircle2, CreditCard, Download, ExternalLink, Eye, Loader2, RefreshCw, Wallet, X } from 'lucide-react';
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
  charge_id: number | null;
  invoice_reference: string | null;
  invoice_number: string | null;
  activity_url: string;
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
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState('tuition');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [receiptAction, setReceiptAction] = useState<{ id: number; mode: 'view' | 'download' } | null>(null);
  const paymentDialogRef = useRef<HTMLDivElement>(null);
  const selectedLiability = paymentTarget === 'tuition'
    ? null
    : account?.liabilities.find((liability) => String(liability.id) === paymentTarget) ?? null;

  async function downloadActivityInvoice(request: StudentActivityRequest) {
    setError('');
    try {
      const blob = await api.activityRequests.invoice(request.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${request.invoice_number || `activity-invoice-${request.id}`}.pdf`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to download the invoice.');
    }
  }

  const openPaymentModal = () => {
    setPaymentTarget('tuition');
    setAmount(account && account.amount_due > 0 ? account.amount_due.toFixed(2) : '');
    setError('');
    setPaymentModalOpen(true);
  };

  useEffect(() => {
    if (!paymentModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    paymentDialogRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !paying && !verifying) setPaymentModalOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [paymentModalOpen, paying, verifying]);

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
    if (paymentTarget !== 'tuition' && !selectedLiability) {
      setError('Choose an outstanding liability to pay.');
      return;
    }
    const paymentAmount = Number(amount);
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0 || paymentAmount > 100000000) {
      setError('Enter a payment amount greater than zero and within the transaction limit.');
      return;
    }

    setPaying(true);
    setError('');
    try {
      const response = (selectedLiability
        ? await api.students.initiateLiabilityPayment(selectedLiability.id)
        : await api.students.initiateMyPayment(paymentAmount)) as { data: FlutterwaveInlineCheckout };
      await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
        const transactionId = String(transaction.transaction_id ?? '');
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
          setError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
          setPaying(false);
          return;
        }
        setVerifying(true);
        setNotice(`Confirming your ${selectedLiability ? 'liability' : 'account'} payment securely...`);
        try {
          const verification = await api.students.verifyMyPayment(transactionId, response.data.reference) as { message?: string };
          setNotice(verification.message || `Payment confirmed. Your ${selectedLiability ? 'liability' : 'account'} has been updated.`);
          setPaymentModalOpen(false);
          try {
            await uploadConfirmedReceipt(response.data.reference, transactionId);
            setNotice(`Payment confirmed. Your ${selectedLiability ? 'liability is settled and your' : ''} branded receipt has been saved to your billing account.`);
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
    <main className="mx-auto max-w-7xl space-y-6 pb-10 sm:space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Your account</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Billing &amp; payments</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your fees, payments and account credit.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={openPaymentModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-900/15 transition hover:bg-blue-800">
            <CreditCard className="h-4 w-4" /> Make payment
          </button>
          <button type="button" onClick={() => { setLoading(true); void loadBilling().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to refresh your account.')).finally(() => setLoading(false)); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <RefreshCw className="h-4 w-4" /> Refresh account
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

      {account && <>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-lg shadow-blue-950/10 sm:p-7">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Student account · {account.term}</p>
              <h2 className="mt-2 text-xl font-bold sm:text-2xl">{account.student.name}</h2>
              <p className="mt-1 text-xs text-blue-100/75">ID {account.student.student_id} <span className="mx-1.5">·</span> {account.student.cohort}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4 backdrop-blur-sm md:min-w-64">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100/75">Total amount due</p>
              <p className="mt-1 text-3xl font-bold text-white">{money(account.total_account_due, account.currency)}</p>
              <p className="mt-1 text-[11px] text-blue-100/75">Tuition {money(account.amount_due, account.currency)} <span className="mx-1">·</span> Liabilities {money(account.liabilities_due, account.currency)}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Account summary">
          {[
            { label: 'Total charges', amount: account.total_charges, icon: CreditCard, color: 'text-blue-900 bg-blue-50' },
            { label: 'Account payments', amount: account.total_paid, icon: ArrowDownLeft, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'Outstanding liability', amount: account.amount_due, icon: ArrowUpRight, color: 'text-amber-700 bg-amber-50' },
            { label: 'Account credit', amount: account.account_credit, icon: Wallet, color: 'text-violet-700 bg-violet-50' },
          ].map((metric) => {
            const Icon = metric.icon;
            return <article key={metric.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">{metric.label}</p>
                <span className={`rounded-xl p-2 ${metric.color}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 break-words text-lg font-bold tracking-tight text-slate-950 sm:mt-4 sm:text-2xl">{money(metric.amount, account.currency)}</p>
            </article>;
          })}
        </section>

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

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-950">Other liabilities</h2><p className="mt-1 text-xs text-slate-500">Choose an invoice from the Make payment window. Payment is marked settled only after Flutterwave verifies it.</p></div>
          {account.liabilities.length ? <div className="divide-y divide-slate-100">{account.liabilities.map((liability) => {
            const outstanding = liability.outstanding_amount || 0;
            const pending = liability.pending_amount || 0;
            const settled = outstanding <= 0;
            return <article key={liability.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-bold text-slate-900">{liability.description}</p><p className="mt-1 text-xs text-slate-500">{liabilityLabel(liability)} · {liability.term} · Invoice {liability.reference}</p><p className="mt-1 text-xs text-slate-600">Invoiced {money(liability.amount, liability.currency)} · Paid {money(liability.amount - outstanding, liability.currency)}</p></div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${settled ? 'bg-emerald-50 text-emerald-700' : pending > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>{settled ? 'Paid & verified' : pending > 0 ? 'Payment pending' : 'Outstanding'}</span>
            </article>;
          })}</div> : <p className="p-6 text-sm text-slate-500">No other outstanding liabilities.</p>}
        </section>

        {activityRequests.length > 0 && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5"><h2 className="text-base font-black text-slate-950">Activity access requests</h2><p className="mt-1 text-xs text-slate-500">Track Finance invoicing and IT access decisions.</p></div>
          <div className="divide-y divide-slate-100">{activityRequests.map((request) => <article key={request.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold text-slate-900">{request.activity_name}</p><p className="mt-1 text-xs text-slate-500">{request.activity_type} · Requested {new Date(request.created_at).toLocaleDateString()}{request.invoice_number ? ` · ${request.invoice_number}` : request.invoice_reference ? ` · Invoice ${request.invoice_reference}` : ''}</p>{request.amount !== null && <p className="mt-1 text-xs font-semibold text-slate-600">Invoice amount {money(request.amount, request.currency || account.currency)}</p>}{request.charge_id && <button type="button" onClick={() => void downloadActivityInvoice(request)} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:underline"><Download size={13} />Download invoice</button>}{request.status === 'approved' && <a href={request.activity_url} className="mt-2 ml-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 hover:underline">Open activity<ExternalLink size={13} /></a>}</div>
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
        {paymentModalOpen && <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !paying && !verifying) setPaymentModalOpen(false);
          }}
        >
          <div
            ref={paymentDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-payment-title"
            aria-describedby="student-payment-description"
            tabIndex={-1}
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl outline-none"
          >
            <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-slate-950 to-blue-900 px-5 py-5 text-white sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200">Secure checkout</p>
                <h2 id="student-payment-title" className="mt-1 text-xl font-bold">Make a payment</h2>
                <p id="student-payment-description" className="mt-1 text-xs text-blue-100/80">Choose what to pay and enter the amount.</p>
              </div>
              <button type="button" aria-label="Close payment dialog" disabled={paying || verifying} onClick={() => setPaymentModalOpen(false)} className="rounded-xl p-2 text-blue-100 transition hover:bg-white/10 hover:text-white disabled:opacity-50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <form onSubmit={(event) => void startPayment(event)} className="space-y-5">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Payment for</span>
                    <select
                      value={paymentTarget}
                      onChange={(event) => {
                        const target = event.target.value;
                        setPaymentTarget(target);
                        setError('');
                        if (target === 'tuition') setAmount(account.amount_due > 0 ? account.amount_due.toFixed(2) : '');
                        else {
                          const liability = account.liabilities.find((item) => String(item.id) === target);
                          setAmount(liability?.outstanding_amount ? liability.outstanding_amount.toFixed(2) : '');
                        }
                      }}
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="tuition">Tuition / student account</option>
                      {account.liabilities.filter((liability) => (liability.outstanding_amount || 0) > 0).map((liability) => (
                        <option key={liability.id} value={String(liability.id)} disabled={(liability.pending_amount || 0) > 0}>
                          {liability.description}{(liability.pending_amount || 0) > 0 ? ' · payment pending' : ` · ${money(liability.outstanding_amount || 0, liability.currency)} due`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{selectedLiability ? 'Invoice balance' : 'Tuition payment'}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{selectedLiability ? selectedLiability.description : 'Part-pay your tuition or add money to your account credit.'}</p>
                    {selectedLiability && <p className="mt-1 text-xs text-slate-500">Outstanding {money(selectedLiability.outstanding_amount || 0, selectedLiability.currency)}</p>}
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Amount ({selectedLiability?.currency || account.currency})</span>
                    <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200 focus-within:border-blue-700 focus-within:ring-2 focus-within:ring-blue-100">
                      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-500">{selectedLiability?.currency || account.currency}</span>
                      <input
                        type="number"
                        required
                        min="0.01"
                        max={selectedLiability ? selectedLiability.outstanding_amount : 100000000}
                        step="0.01"
                        value={amount}
                        readOnly={Boolean(selectedLiability)}
                        onChange={(event) => setAmount(event.target.value)}
                        placeholder={!selectedLiability && account.amount_due > 0 ? account.amount_due.toFixed(2) : 'Enter payment amount'}
                        className="w-full px-3 py-3 text-sm font-semibold text-slate-900 outline-none read-only:bg-slate-100"
                      />
                    </div>
                    {!selectedLiability && <p className="mt-1.5 text-[11px] leading-5 text-slate-500">Pay partially or more than your tuition balance. Any excess becomes account credit.</p>}
                  </label>
                  <p className="rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-900">Flutterwave securely handles your selected payment method and any OTP or verification codes. Never share a code with anyone.</p>
                  {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-800">{error}</p>}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button type="button" disabled={paying || verifying} onClick={() => setPaymentModalOpen(false)} className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50">Cancel</button>
                    <button type="submit" disabled={paying || verifying || (Boolean(selectedLiability) && (selectedLiability?.pending_amount || 0) > 0)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
                      {paying || verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {paying ? 'Opening Flutterwave…' : verifying ? 'Verifying payment…' : 'Continue to Flutterwave'}
                    </button>
                  </div>
              </form>
            </div>
          </div>
        </div>}
      </>}
    </main>
  );
}
