'use client';

import { confirmWithApp } from '@/components/ui/app-dialogs';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Printer,
  Receipt,
  Search,
  Send,
  TrendingUp,
  Wallet,
  X,
  Plus,
  UserRound,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { createPaymentReceiptPdf, downloadPaymentReceipt, viewPaymentReceipt, type PaymentReceiptData } from '@/lib/payment-receipt';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';

type PaymentLedgerRecord = Omit<PaymentReceiptData, 'receipt_token'> & {
  id: number;
  description: string;
  receipt_token: string | null;
  receipt_path?: string | null;
  entry_type: 'charge' | 'payment';
  status: 'posted' | 'pending' | 'paid' | 'failed' | 'void';
  payment_purpose: 'tuition' | 'assessment';
  assessment_type: 'quiz' | 'exam' | 'assignment' | null;
  assessment_id: number | null;
  liability_type: 'tuition' | 'missed_audio' | 'assignment' | 'quiz' | 'exam' | 'other_penalty' | null;
};

type PaymentLedgerResponse = { data: PaymentLedgerRecord[] };
type StudentLookup = { student_id: string; name: string; email?: string; class?: string; account_status?: string };
type StudentsResponse = { data: StudentLookup[] };
type PaymentReceiptsResponse = { data: (PaymentReceiptData & { id: number })[] };
type PaymentAccount = {
  id: string;
  name: string;
  cohort: string;
  currency: string;
  invoiced: number;
  paid: number;
  credited: number;
  balance: number;
  status: 'Settled' | 'Partial Payment' | 'Arrears Outstanding';
  records: PaymentLedgerRecord[];
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

const getStatusBadge = (status: PaymentAccount['status']) => {
  switch (status) {
    case 'Settled': return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'Partial Payment': return 'border-amber-100 bg-amber-50 text-amber-700';
    default: return 'border-rose-100 bg-rose-50 text-rose-700';
  }
};

const getLiabilityLabel = (record: PaymentLedgerRecord) => {
  const type = record.liability_type;
  if (type === 'missed_audio') return 'Missed class audio';
  if (type === 'assignment') return 'Missed assignment';
  if (type === 'quiz') return 'Missed quiz';
  if (type === 'exam') return 'Missed exam';
  if (type === 'tuition' || record.description.toLowerCase().includes('tuition')) return 'Tuition / school fees';
  return 'Other penalty / charge';
};

const isAccountPayment = (record: PaymentLedgerRecord) =>
  record.entry_type === 'payment' && record.status === 'paid' && record.payment_purpose === 'tuition';

export default function AdminPaymentsPage() {
  const [records, setRecords] = useState<PaymentLedgerRecord[]>([]);
  const [students, setStudents] = useState<StudentLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cohortFilter, setCohortFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'paid'>('name');
  const [page, setPage] = useState(1);
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);
  const [paymentReceipts, setPaymentReceipts] = useState<(PaymentReceiptData & { id: number })[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptAction, setReceiptAction] = useState<{ id: number; mode: 'view' | 'download' } | null>(null);
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [paymentStudent, setPaymentStudent] = useState<StudentLookup | null>(null);
  const [paymentPurpose, setPaymentPurpose] = useState<'tuition' | 'assessment'>('tuition');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'flutterwave' | 'Cash' | 'Bank transfer' | 'Mobile money' | 'Other'>('flutterwave');
  const [externalReference, setExternalReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, PaymentLedgerRecord['status']>>({});
  const [verifyingFlutterwave, setVerifyingFlutterwave] = useState(false);
  const [syncingLiabilities, setSyncingLiabilities] = useState(false);
  const receiptRequestId = useRef(0);
  const pageSize = 8;

  useEffect(() => {
    let active = true;
    const loadFinanceData = async () => {
      try {
        await api.students.syncAdminActivityLiabilities();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to synchronize activity liabilities.');
      }
      try {
        const [ledgerResponse, studentsResponse] = await Promise.all([
          api.students.adminPaymentLedger() as Promise<PaymentLedgerResponse>,
          api.students.list() as Promise<StudentsResponse>,
        ]);
        if (!active) return;
        setRecords(ledgerResponse.data);
        setStudents(studentsResponse.data || []);
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load student payment records.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadFinanceData();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const transactionId = query.get('transaction_id');
    const reference = query.get('tx_ref');
    const checkoutStatus = query.get('status');
    if (!transactionId || !reference) return;

    let active = true;
    window.history.replaceState({}, '', window.location.pathname);
    if (checkoutStatus !== 'successful') {
      queueMicrotask(() => {
        if (active) setNotice('Flutterwave checkout was not completed. The transaction remains available in the ledger for status review.');
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (!active) return;
      setVerifyingFlutterwave(true);
      setError('');
    });
    const completeCheckout = async () => {
      try {
        const verified = await api.students.verifyAdminPayment(transactionId, reference) as { data: PaymentLedgerRecord };
        if (!active) return;
        const verifiedPayment = verified.data;
        if (!verifiedPayment.receipt_token) throw new Error('Flutterwave verified the payment but did not return a receipt verification token.');
        const paymentReceipt: PaymentReceiptData = {
          student_name: verifiedPayment.student_name,
          student_id: verifiedPayment.student_id,
          cohort: verifiedPayment.cohort,
          paid_for: verifiedPayment.description,
          term: verifiedPayment.term,
          amount: verifiedPayment.amount,
          currency: verifiedPayment.currency,
          reference: verifiedPayment.reference,
          gateway: verifiedPayment.gateway,
          gateway_transaction_id: verifiedPayment.gateway_transaction_id,
          created_at: verifiedPayment.created_at,
          receipt_token: verifiedPayment.receipt_token,
        };
        const receiptPdf = await createPaymentReceiptPdf(paymentReceipt);
        const formData = new FormData();
        formData.append('payment_id', String(verifiedPayment.id));
        formData.append('status', 'paid');
        formData.append('receipt_token', verifiedPayment.receipt_token);
        formData.append('receipt_file', receiptPdf, `Rhema-Receipt-${verifiedPayment.reference}.pdf`);
        const updated = await api.students.updateAdminPaymentStatus(formData) as { message: string };
        if (active) {
          const latest = await api.students.adminPaymentLedger() as PaymentLedgerResponse;
          setRecords(latest.data);
          setNotice(updated.message || 'Flutterwave payment verified. The paid amount and receipt are now attached to the student account.');
        }
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not verify the Flutterwave payment. You can update the transaction status after checking the payment.');
      } finally {
        if (active) setVerifyingFlutterwave(false);
      }
    };
    void completeCheckout();
    return () => { active = false; };
  }, []);

  const accounts = useMemo(() => {
    const byStudent = new Map<string, PaymentLedgerRecord[]>();
    records.forEach((record) => {
      const studentRecords = byStudent.get(record.student_id) || [];
      studentRecords.push(record);
      byStudent.set(record.student_id, studentRecords);
    });
    students.forEach((student) => {
      if (!byStudent.has(student.student_id)) byStudent.set(student.student_id, []);
    });

    return Array.from(byStudent.entries()).map(([studentId, studentRecords]): PaymentAccount => {
      const student = students.find((item) => item.student_id === studentId);
      const invoiced = studentRecords
        .filter((record) => record.entry_type === 'charge' && record.status === 'posted')
        .reduce((total, record) => total + record.amount, 0);
      const paid = studentRecords
        .filter((record) => record.entry_type === 'payment' && record.status === 'paid')
        .reduce((total, record) => total + record.amount, 0);
      const credited = studentRecords.filter(isAccountPayment).reduce((total, record) => total + record.amount, 0);
      const balance = Math.max(0, invoiced - credited);
      const firstRecord = studentRecords[0];
      return {
        id: studentId,
        name: firstRecord?.student_name || student?.name || 'Student record unavailable',
        cohort: firstRecord?.cohort || student?.class || '',
        currency: firstRecord?.currency || 'ZMW',
        invoiced,
        paid,
        credited,
        balance,
        status: balance <= 0 ? 'Settled' : credited > 0 ? 'Partial Payment' : 'Arrears Outstanding',
        records: studentRecords,
      };
    });
  }, [records, students]);

  const cohorts = useMemo(
    () => Array.from(new Set(accounts.map((account) => account.cohort).filter(Boolean))).sort(),
    [accounts],
  );
  const filteredAccounts = useMemo(() => accounts
    .filter((account) => statusFilter === 'All' || account.status === statusFilter)
    .filter((account) => cohortFilter === 'All' || account.cohort === cohortFilter)
    .filter((account) => `${account.name} ${account.id} ${students.find((student) => student.student_id === account.id)?.email || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => sortBy === 'balance'
      ? right.balance - left.balance
      : sortBy === 'paid'
        ? right.paid - left.paid
        : left.name.localeCompare(right.name)), [accounts, cohortFilter, search, sortBy, statusFilter, students]);
  const pageCount = Math.max(1, Math.ceil(filteredAccounts.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const pagedAccounts = filteredAccounts.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const matchingStudents = students
    .filter((student) => {
      const query = studentSearch.trim().toLowerCase();
      return !query || `${student.name} ${student.email || ''} ${student.student_id}`.toLowerCase().includes(query);
    })
    .slice(0, 8);
  const totalInvoiced = accounts.reduce((total, account) => total + account.invoiced, 0);
  const totalPaid = accounts.reduce((total, account) => total + account.paid, 0);
  const totalOutstanding = accounts.reduce((total, account) => total + account.balance, 0);
  const currency = accounts[0]?.currency || 'ZMW';
  const handleLiabilitySync = async () => {
    if (syncingLiabilities) return;
    setSyncingLiabilities(true);
    setError('');
    setNotice('');
    try {
      const response = await api.students.syncAdminActivityLiabilities() as {
        data: { created: Record<string, number>; total_created: number };
      };
      const ledgerResponse = await api.students.adminPaymentLedger() as PaymentLedgerResponse;
      setRecords(ledgerResponse.data);
      setNotice(response.data.total_created
        ? `${response.data.total_created} new activity liabilities were added to student accounts.`
        : 'Activity liabilities are up to date. No new missed activities were found.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to synchronize student activity liabilities.');
    } finally {
      setSyncingLiabilities(false);
    }
  };

  const openStatement = async (account: PaymentAccount) => {
    const requestId = ++receiptRequestId.current;
    setSelectedAccount(account);
    setPaymentReceipts([]);
    setReceiptError('');
    setLoadingReceipts(true);
    try {
      const [ledgerResponse, receiptsResponse] = await Promise.all([
        api.students.adminPaymentLedger() as Promise<PaymentLedgerResponse>,
        api.students.adminPaymentReceipts(account.id) as Promise<PaymentReceiptsResponse>,
      ]);
      if (receiptRequestId.current === requestId) {
        const studentRecords = ledgerResponse.data.filter((record) => record.student_id === account.id);
        setRecords(ledgerResponse.data);
        const invoiced = studentRecords.filter((record) => record.entry_type === 'charge' && record.status === 'posted').reduce((sum, record) => sum + record.amount, 0);
        const paid = studentRecords.filter((record) => record.entry_type === 'payment' && record.status === 'paid').reduce((sum, record) => sum + record.amount, 0);
        const credited = studentRecords.filter(isAccountPayment).reduce((sum, record) => sum + record.amount, 0);
        const balance = Math.max(0, invoiced - credited);
        setSelectedAccount({
          ...account,
          records: studentRecords,
          invoiced,
          paid,
          credited,
          balance,
          status: balance <= 0 ? 'Settled' : credited > 0 ? 'Partial Payment' : 'Arrears Outstanding',
        });
        const paidTransactions = studentRecords
          .filter((record) => record.entry_type === 'payment' && record.status === 'paid' && record.receipt_token)
          .map((record) => ({ ...record, paid_for: record.description })) as (PaymentReceiptData & { id: number })[];
        setPaymentReceipts(receiptsResponse.data.length ? receiptsResponse.data : paidTransactions);
      }
    } catch (reason) {
      if (receiptRequestId.current === requestId) {
        setReceiptError(reason instanceof Error ? reason.message : 'Unable to load confirmed payment receipts.');
      }
    } finally {
      if (receiptRequestId.current === requestId) setLoadingReceipts(false);
    }
  };

  const closeStatement = () => {
    receiptRequestId.current++;
    setSelectedAccount(null);
    setPaymentReceipts([]);
    setStatusDrafts({});
    setReceiptError('');
    setLoadingReceipts(false);
  };

  const handleReceipt = async (receipt: PaymentReceiptData & { id: number }, mode: 'view' | 'download') => {
    setReceiptAction({ id: receipt.id, mode });
    setReceiptError('');
    try {
      if (mode === 'view') await viewPaymentReceipt(receipt);
      else await downloadPaymentReceipt(receipt);
    } catch (reason) {
      setReceiptError(reason instanceof Error ? reason.message : 'Unable to download this payment receipt.');
    } finally {
      setReceiptAction(null);
    }
  };

  const handleCreatePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentStudent || submittingPayment) return;
    const amount = Number(paymentAmount);
    const description = paymentDescription.trim();
    if (!Number.isFinite(amount) || amount <= 0 || !description) {
      setError('Select a student and enter a valid amount and payment description.');
      return;
    }

    setSubmittingPayment(true);
    setError('');
    setNotice('');
    let inlineCheckoutOpened = false;
    try {
      if (paymentMethod === 'flutterwave') {
        const response = await api.students.initiateAdminPayment({
          student_id: paymentStudent.student_id,
          amount,
          description,
          payment_purpose: paymentPurpose,
          term: paymentStudent.class || '',
        }) as { data: FlutterwaveInlineCheckout };
        await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
          const transactionId = String(transaction.transaction_id ?? '');
          if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
            setError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
            setSubmittingPayment(false);
            return;
          }

          setVerifyingFlutterwave(true);
          try {
            const verified = await api.students.verifyAdminPayment(transactionId, response.data.reference) as { data: PaymentLedgerRecord };
            const verifiedPayment = verified.data;
            if (!verifiedPayment.receipt_token) {
              throw new Error('Flutterwave verified the payment but did not return a receipt verification token.');
            }
            const paymentReceipt: PaymentReceiptData = {
              student_name: verifiedPayment.student_name,
              student_id: verifiedPayment.student_id,
              cohort: verifiedPayment.cohort,
              paid_for: verifiedPayment.description,
              term: verifiedPayment.term,
              amount: verifiedPayment.amount,
              currency: verifiedPayment.currency,
              reference: verifiedPayment.reference,
              gateway: verifiedPayment.gateway,
              gateway_transaction_id: verifiedPayment.gateway_transaction_id,
              created_at: verifiedPayment.created_at,
              receipt_token: verifiedPayment.receipt_token,
            };
            const receiptPdf = await createPaymentReceiptPdf(paymentReceipt);
            const formData = new FormData();
            formData.append('payment_id', String(verifiedPayment.id));
            formData.append('status', 'paid');
            formData.append('receipt_token', verifiedPayment.receipt_token);
            formData.append('receipt_file', receiptPdf, `Rhema-Receipt-${verifiedPayment.reference}.pdf`);
            const receiptResult = await api.students.updateAdminPaymentStatus(formData) as { message?: string };
            const latest = await api.students.adminPaymentLedger() as PaymentLedgerResponse;
            setRecords(latest.data);
            setManualPaymentOpen(false);
            setPaymentStudent(null);
            setStudentSearch('');
            setPaymentAmount('');
            setPaymentDescription('');
            setNotice(receiptResult.message || 'Flutterwave payment verified and receipt attached to the student account.');
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not verify the Flutterwave payment.');
          } finally {
            setVerifyingFlutterwave(false);
            setSubmittingPayment(false);
          }
        }, () => {
          setSubmittingPayment(false);
          setNotice('Checkout closed. No payment was confirmed.');
        });
        inlineCheckoutOpened = true;
        return;
      }

      const referenceBytes = crypto.getRandomValues(new Uint8Array(12));
      const reference = `MANUAL-${Array.from(referenceBytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const receiptToken = Array.from(tokenBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
      const paymentReceipt: PaymentReceiptData = {
        student_name: paymentStudent.name,
        student_id: paymentStudent.student_id,
        cohort: paymentStudent.class || '',
        paid_for: description,
        term: paymentStudent.class || '',
        amount,
        currency: 'ZMW',
        reference,
        gateway: paymentMethod,
        gateway_transaction_id: externalReference.trim() || null,
        created_at: new Date().toISOString(),
        receipt_token: receiptToken,
      };
      const pdf = await createPaymentReceiptPdf(paymentReceipt);
      const formData = new FormData();
      formData.append('student_id', paymentStudent.student_id);
      formData.append('amount', amount.toFixed(2));
      formData.append('payment_method', paymentMethod);
      formData.append('external_reference', externalReference.trim());
      formData.append('description', description);
      formData.append('payment_purpose', paymentPurpose);
      formData.append('reference', reference);
      formData.append('receipt_token', receiptToken);
      formData.append('receipt_file', pdf, `Rhema-Receipt-${reference}.pdf`);
      const response = await api.students.createAdminManualPayment(formData) as { data: PaymentLedgerRecord; message: string };
      setRecords((current) => [response.data, ...current.filter((record) => record.id !== response.data.id)]);
      setManualPaymentOpen(false);
      setPaymentStudent(null);
      setStudentSearch('');
      setNotice(response.message || 'Manual payment recorded. Its receipt PDF is attached to the transaction.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to start or record this student payment.');
    } finally {
      if (!inlineCheckoutOpened) setSubmittingPayment(false);
    }
  };

  const handlePaymentStatusUpdate = async (transaction: PaymentLedgerRecord, status: PaymentLedgerRecord['status']) => {
    if ((transaction.status === status && (status !== 'paid' || transaction.receipt_path)) || updatingPaymentId !== null) return;
    if (status === 'paid' && !(await confirmWithApp('Confirm that you verified this payment. Marking it paid will credit the student account and issue a receipt.', { title: 'Confirm payment verification?', confirmText: 'Mark as paid' }))) return;
    setUpdatingPaymentId(transaction.id);
    setError('');
    try {
      const formData = new FormData();
      formData.append('payment_id', String(transaction.id));
      formData.append('status', status);
      if (status === 'paid') {
        const receiptToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
        const paymentReceipt: PaymentReceiptData = {
          student_name: transaction.student_name,
          student_id: transaction.student_id,
          cohort: transaction.cohort,
          paid_for: transaction.description,
          term: transaction.term,
          amount: transaction.amount,
          currency: transaction.currency,
          reference: transaction.reference,
          gateway: transaction.gateway,
          gateway_transaction_id: transaction.gateway_transaction_id || null,
          created_at: transaction.created_at,
          receipt_token: receiptToken,
        };
        const pdf = await createPaymentReceiptPdf(paymentReceipt);
        formData.append('receipt_token', receiptToken);
        formData.append('receipt_file', pdf, `Rhema-Receipt-${transaction.reference}.pdf`);
      }
      const response = await api.students.updateAdminPaymentStatus(formData) as { data: PaymentLedgerRecord; message: string };
      setRecords((current) => current.map((record) => record.id === response.data.id ? response.data : record));
      setSelectedAccount((current) => {
        if (!current) return current;
        const updatedRecords = current.records.map((record) => record.id === response.data.id ? response.data : record);
        const invoiced = updatedRecords.filter((record) => record.entry_type === 'charge' && record.status === 'posted').reduce((sum, record) => sum + record.amount, 0);
        const paid = updatedRecords.filter((record) => record.entry_type === 'payment' && record.status === 'paid').reduce((sum, record) => sum + record.amount, 0);
        const credited = updatedRecords.filter(isAccountPayment).reduce((sum, record) => sum + record.amount, 0);
        const balance = Math.max(0, invoiced - credited);
        return {
          ...current,
          records: updatedRecords,
          invoiced,
          paid,
          credited,
          balance,
          status: balance <= 0 ? 'Settled' : credited > 0 ? 'Partial Payment' : 'Arrears Outstanding',
        };
      });
      setStatusDrafts((current) => {
        const next = { ...current };
        delete next[transaction.id];
        return next;
      });
      if (response.data.status === 'paid' && response.data.receipt_token) {
        const receipt: PaymentReceiptData & { id: number } = {
          ...response.data,
          paid_for: response.data.description,
          receipt_token: response.data.receipt_token,
        };
        setPaymentReceipts((current) => [receipt, ...current.filter((item) => item.id !== receipt.id)]);
      } else {
        setPaymentReceipts((current) => current.filter((item) => item.id !== transaction.id));
      }
      setNotice(response.message || `Payment status updated to ${status}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the payment status.');
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  return (
    <main className="relative min-h-screen space-y-6 pb-10">
      <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Finance</span><span>/</span><span className="text-slate-600">Student accounts</span>
          </div>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Finance &amp; Student Liabilities</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">Review every posted student liability, missed activity charge and confirmed payment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm">
            <Receipt className="h-3.5 w-3.5 text-slate-500" /> {accounts.length} student accounts
          </div>
          <button type="button" onClick={() => void handleLiabilitySync()} disabled={syncingLiabilities || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
            {syncingLiabilities ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Sync liabilities
          </button>
          <button type="button" onClick={() => {
            setManualPaymentOpen(true);
            setError('');
            setNotice('');
            setStudentSearch('');
            setPaymentStudent(null);
            setPaymentPurpose('tuition');
            setPaymentDescription('');
            setPaymentAmount('');
            setPaymentMethod('flutterwave');
            setExternalReference('');
          }} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-800">
            <Plus className="h-4 w-4" /> Record payment
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}
      {verifyingFlutterwave && <div role="status" className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900"><Loader2 className="h-4 w-4 animate-spin" />Verifying Flutterwave payment and preparing the receipt…</div>}
      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
        Activity charges: ZMW 150 per missed assignment, quiz or exam after its deadline with no submission or attempt; ZMW 50 per absent class session with a published required audio. Historical eligible misses are included.
      </p>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Finance summary">
        <article className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gross Invoiced Balance</span><CreditCard className="h-4 w-4 text-blue-700" /></div>
          <p className="text-base font-black tracking-tight text-slate-900">{formatMoney(totalInvoiced, currency)}</p>
          <span className="block text-[10px] font-medium text-slate-400">Posted charges across all student accounts</span>
        </article>
        <article className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Collected Pool</span><TrendingUp className="h-4 w-4 text-emerald-500" /></div>
          <p className="text-base font-black tracking-tight text-slate-900">{formatMoney(totalPaid, currency)}</p>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-100 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700">{totalInvoiced ? Math.round(totalPaid / totalInvoiced * 100) : 0}% collected</span>
        </article>
        <article className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Outstanding</span><Wallet className="h-4 w-4 text-amber-500" /></div>
          <p className="text-base font-black tracking-tight text-slate-900">{formatMoney(totalOutstanding, currency)}</p>
          <span className="block text-[10px] font-medium text-slate-400">Unpaid posted charges</span>
        </article>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm md:flex-row md:items-center md:justify-between">
        <label className="relative w-full max-w-md">
          <span className="sr-only">Search student accounts</span>
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Filter by student name or account reference..." className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs font-medium outline-none transition focus:border-slate-400 focus:bg-white" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Filter by account status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            <option value="All">All Payment States</option>
            <option value="Settled">Settled Account</option>
            <option value="Partial Payment">Partial Payment</option>
            <option value="Arrears Outstanding">Arrears Outstanding</option>
          </select>
          <select aria-label="Filter by cohort" value={cohortFilter} onChange={(event) => { setCohortFilter(event.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            <option value="All">All Cohorts</option>
            {cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}
          </select>
          <select aria-label="Sort accounts" value={sortBy} onChange={(event) => setSortBy(event.target.value as 'name' | 'balance' | 'paid')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            <option value="name">Sort: Student</option>
            <option value="balance">Sort: Outstanding</option>
            <option value="paid">Sort: Paid amount</option>
          </select>
          <span aria-label="Export unavailable" title="Export is not available yet" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400"><FileSpreadsheet className="h-4 w-4" /></span>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Student Account Ledger</h2>
          <p className="mt-0.5 text-[11px] font-medium text-slate-400">Balances include tuition, recorded penalties, missed audio sessions and missed assessments.</p>
        </div>
        {loading ? (
          <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading student account records...</div>
        ) : pagedAccounts.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead><tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-4 py-3">Account Node</th>
                <th className="px-4 py-3">Student Name</th>
                <th className="px-4 py-3">Cohort</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invoiced Gross</th>
                <th className="px-4 py-3">Paid Pool</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3 text-right">Audit Action</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {pagedAccounts.map((account) => (
                  <tr key={account.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 font-mono text-[11px] font-bold tracking-wider text-slate-900">{account.id}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{account.name}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-500">{account.cohort || '—'}</td>
                    <td className="px-4 py-3.5"><span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${getStatusBadge(account.status)}`}>{account.status}</span></td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-800">{formatMoney(account.invoiced, account.currency)}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-emerald-600">{formatMoney(account.paid, account.currency)}</td>
                    <td className={`px-4 py-3.5 font-mono font-bold ${account.balance > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{formatMoney(account.balance, account.currency)}</td>
                    <td className="px-4 py-3.5 text-right"><button type="button" onClick={() => void openStatement(account)} className="inline-flex items-center gap-0.5 font-black text-slate-400 transition hover:text-blue-700">Audit File <ArrowUpRight className="h-3 w-3" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">{accounts.length ? 'No accounts match these filters' : 'No student finance records found'}</p>
            <p className="mt-1 text-xs text-slate-500">Charges and confirmed payments will appear here.</p>
          </div>
        )}
        <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Showing {filteredAccounts.length ? (visiblePage - 1) * pageSize + 1 : 0}-{Math.min(visiblePage * pageSize, filteredAccounts.length)} of {filteredAccounts.length} accounts</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={visiblePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <span className="font-bold text-slate-700">Page {visiblePage} of {pageCount}</span>
            <button type="button" disabled={visiblePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </footer>
      </section>

      {manualPaymentOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !submittingPayment) setManualPaymentOpen(false);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="create-payment-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-900">Student finance</p>
                <h2 id="create-payment-title" className="mt-1 text-lg font-black text-slate-950">Create payment</h2>
                <p className="mt-1 text-xs text-slate-500">Search for a student, choose what the payment covers, then start checkout or record funds received.</p>
              </div>
              <button type="button" onClick={() => setManualPaymentOpen(false)} disabled={submittingPayment} aria-label="Close payment form" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50"><X className="h-4 w-4" /></button>
            </header>
            <form onSubmit={(event) => void handleCreatePayment(event)} className="space-y-4 p-5">
              <div className="space-y-2">
                <label htmlFor="payment-student-search" className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Find student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input id="payment-student-search" value={studentSearch} onChange={(event) => { setStudentSearch(event.target.value); setPaymentStudent(null); }} placeholder="Search by name, email, or student ID" autoComplete="off" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white" />
                </div>
                {!paymentStudent && (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {matchingStudents.length ? matchingStudents.map((student) => (
                      <button key={student.student_id} type="button" onClick={() => { setPaymentStudent(student); setStudentSearch(`${student.name} · ${student.student_id}`); setPaymentDescription(paymentPurpose === 'tuition' ? `Tuition payment (${student.class || 'student account'})` : 'Assessment fee'); }} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-0 hover:bg-blue-50">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800"><UserRound className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-900">{student.name}</span>
                          <span className="block truncate text-[10px] text-slate-500">{student.email || 'No email'} · {student.student_id} · {student.class || 'No cohort'}</span>
                        </span>
                      </button>
                    )) : <p className="p-3 text-xs text-slate-500">{loading ? 'Loading student list…' : 'No students matched that search.'}</p>}
                  </div>
                )}
                {paymentStudent && <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div><p className="text-xs font-black text-slate-900">{paymentStudent.name}</p><p className="mt-0.5 text-[10px] text-slate-600">{paymentStudent.email || 'No email'} · {paymentStudent.student_id} · {paymentStudent.class || 'No cohort'}</p></div>
                  <button type="button" onClick={() => { setPaymentStudent(null); setStudentSearch(''); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-white" aria-label="Choose a different student"><X className="h-4 w-4" /></button>
                </div>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Paying for</span>
                  <select value={paymentPurpose} onChange={(event) => {
                    const purpose = event.target.value as 'tuition' | 'assessment';
                    setPaymentPurpose(purpose);
                    setPaymentDescription(purpose === 'tuition' ? `Tuition payment (${paymentStudent?.class || 'student account'})` : 'Assessment fee');
                  }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800">
                    <option value="tuition">Tuition / school fees</option>
                    <option value="assessment">Assessment fee</option>
                  </select>
                </label>
                <label className="space-y-1.5">
                  <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Amount (ZMW)</span>
                  <input type="number" min="0.01" max="100000000" step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800" />
                </label>
              </div>
              <label className="block space-y-1.5">
                <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Payment description</span>
                <input type="text" maxLength={255} required value={paymentDescription} onChange={(event) => setPaymentDescription(event.target.value)} placeholder="e.g. 2026 term 3 tuition" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800" />
              </label>
              <fieldset className="space-y-2">
                <legend className="text-[10px] font-black uppercase tracking-wide text-slate-500">Payment method</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPaymentMethod('flutterwave')} className={`rounded-xl border p-3 text-left ${paymentMethod === 'flutterwave' ? 'border-blue-800 bg-blue-50 ring-1 ring-blue-800' : 'border-slate-200 bg-white'}`}>
                    <span className="block text-xs font-black text-slate-900">Flutterwave checkout</span><span className="mt-1 block text-[10px] text-slate-500">Secure card / mobile money payment</span>
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('Cash')} className={`rounded-xl border p-3 text-left ${paymentMethod !== 'flutterwave' ? 'border-blue-800 bg-blue-50 ring-1 ring-blue-800' : 'border-slate-200 bg-white'}`}>
                    <span className="block text-xs font-black text-slate-900">Record received funds</span><span className="mt-1 block text-[10px] text-slate-500">Cash, bank or mobile money received</span>
                  </button>
                </div>
              </fieldset>
              {paymentMethod !== 'flutterwave' && (
                <>
                  <label className="block space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">Received via</span>
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800">
                      <option value="Cash">Cash</option><option value="Bank transfer">Bank transfer</option><option value="Mobile money">Mobile money</option><option value="Other">Other</option>
                    </select>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">External reference (optional)</span>
                    <input maxLength={80} value={externalReference} onChange={(event) => setExternalReference(event.target.value)} placeholder="Bank / mobile money transaction ID" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-800" />
                  </label>
                </>
              )}
              <button type="submit" disabled={submittingPayment || !paymentStudent || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">
                {submittingPayment ? <><Loader2 className="h-4 w-4 animate-spin" />{paymentMethod === 'flutterwave' ? 'Starting checkout…' : 'Generating receipt…'}</> : paymentMethod === 'flutterwave' ? 'Continue to Flutterwave' : 'Record payment and issue receipt'}
              </button>
            </form>
          </section>
        </div>
      )}

      {selectedAccount && (
        <>
          <button type="button" aria-label="Close statement" className="fixed inset-0 z-40 cursor-default bg-slate-900/40 backdrop-blur-[2px]" onClick={closeStatement} />
          <aside aria-label={`Statement folder for ${selectedAccount.name}`} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-slate-200 bg-slate-50 shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200/80 bg-white p-4">
              <div className="flex items-center gap-2"><Receipt className="h-4 w-4 text-slate-500" /><h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Statement Folder: {selectedAccount.id}</h2></div>
              <button type="button" onClick={closeStatement} aria-label="Close statement" className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50"><X className="h-3.5 w-3.5" /></button>
            </header>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-black tracking-tight text-slate-900">{selectedAccount.name}</h3>
                    <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">{selectedAccount.cohort || 'Cohort unavailable'} · Current term</span>
                  </div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold ${getStatusBadge(selectedAccount.status)}`}>{selectedAccount.status}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400"><span>Description Allocation</span><span>Total Amount</span></div>
                  {selectedAccount.records.filter((record) => record.entry_type === 'charge' && record.status === 'posted').map((charge) => (
                    <div key={charge.id} className="flex justify-between gap-3 border-b border-slate-50 py-2 font-medium text-slate-700 last:border-0">
                      <span className="min-w-0">
                        <span className="mb-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">{getLiabilityLabel(charge)}</span>
                        <span className="block">{charge.description}</span>
                        <span className="mt-0.5 block text-[9px] text-slate-400">{new Date(charge.created_at).toLocaleDateString()} · {charge.reference}</span>
                      </span>
                      <span className="shrink-0 font-mono font-bold">{formatMoney(charge.amount, charge.currency)}</span>
                    </div>
                  ))}
                  {!selectedAccount.records.some((record) => record.entry_type === 'charge' && record.status === 'posted') && <p className="py-1 text-slate-500">No posted liabilities.</p>}
                  <div className="space-y-1 border-t border-slate-100 pt-2 font-bold">
                    <div className="flex justify-between text-[11px] text-slate-500"><span>Gross Invoiced Balance:</span><span className="font-mono">{formatMoney(selectedAccount.invoiced, selectedAccount.currency)}</span></div>
                    <div className="flex justify-between text-[11px] text-emerald-600"><span>Account Payments Applied:</span><span className="font-mono">− {formatMoney(selectedAccount.credited, selectedAccount.currency)}</span></div>
                    <div className="flex justify-between border-t border-dashed border-slate-200 pt-2 text-xs text-slate-900"><span>Net Arrears Outstanding:</span><span className="font-mono font-black text-rose-600">{formatMoney(selectedAccount.balance, selectedAccount.currency)}</span></div>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment transactions &amp; status</h3>
                {selectedAccount.records.filter((record) => record.entry_type === 'payment').length ? (
                  selectedAccount.records.filter((record) => record.entry_type === 'payment').map((transaction) => {
                    const selectedStatus = statusDrafts[transaction.id] ?? transaction.status;
                    const needsReceipt = selectedStatus === 'paid' && !transaction.receipt_path;
                    const canSave = selectedStatus !== transaction.status || needsReceipt;
                    return (
                      <article key={transaction.id} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-[10px] font-bold text-slate-900">{transaction.reference}</p>
                            <p className="mt-0.5 truncate text-[10px] text-slate-600">{transaction.description}</p>
                            <p className="mt-1 text-[9px] text-slate-400">{new Date(transaction.created_at).toLocaleString()} · {formatMoney(transaction.amount, transaction.currency)}</p>
                          </div>
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">{transaction.payment_purpose}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="sr-only" htmlFor={`transaction-status-${transaction.id}`}>Update transaction status</label>
                          <select id={`transaction-status-${transaction.id}`} value={selectedStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [transaction.id]: event.target.value as PaymentLedgerRecord['status'] }))} disabled={updatingPaymentId === transaction.id} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-[10px] font-bold text-slate-700">
                            <option value="posted">Posted</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="void">Void</option>
                          </select>
                          <button type="button" onClick={() => void handlePaymentStatusUpdate(transaction, selectedStatus)} disabled={!canSave || updatingPaymentId !== null} className="rounded-lg bg-slate-900 px-3 py-2 text-[9px] font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-40">
                            {updatingPaymentId === transaction.id ? 'Saving…' : canSave ? 'Save status' : 'Saved'}
                          </button>
                        </div>
                        {transaction.status === 'paid' && transaction.receipt_path && <p className="text-[9px] font-semibold text-emerald-700">Receipt PDF is attached to this transaction.</p>}
                      </article>
                    );
                  })
                ) : <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-500">No payment transactions have been recorded.</div>}
              </section>

              <section className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirmed Payment Receipts</h3>
                {receiptError && paymentReceipts.length > 0 && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{receiptError}</div>}
                {loadingReceipts ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-xs font-semibold text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Loading confirmed receipts...</div>
                ) : receiptError ? (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">{receiptError}</div>
                ) : paymentReceipts.length ? (
                  <div className="space-y-2.5">
                    {paymentReceipts.map((receipt) => (
                      <article key={receipt.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2"><span className="truncate font-mono text-[11px] font-bold text-slate-900">{receipt.reference}</span><span className="rounded border border-emerald-100 bg-emerald-50 px-1 py-0.5 text-[9px] font-bold text-emerald-700">Verified</span></div>
                          <p className="text-[10px] font-medium text-slate-400">{new Date(receipt.created_at).toLocaleString()} via <span className="font-semibold text-slate-600">{receipt.gateway || 'Rhema Bible School'}</span></p>
                          <p className="truncate text-[10px] text-slate-500">{receipt.paid_for}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-mono text-xs font-black text-emerald-700">{formatMoney(receipt.amount, receipt.currency)}</p>
                          <div className="mt-1 flex flex-wrap justify-end gap-1">
                            <button type="button" onClick={() => void handleReceipt(receipt, 'view')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                              {receiptAction?.id === receipt.id && receiptAction.mode === 'view' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}View
                            </button>
                            <button type="button" onClick={() => void handleReceipt(receipt, 'download')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-[10px] font-bold text-blue-900 hover:bg-blue-50 disabled:opacity-50">
                              {receiptAction?.id === receipt.id && receiptAction.mode === 'download' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}PDF
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs font-semibold text-slate-500">No confirmed payment receipts are available for this student.</div>
                )}
              </section>
            </div>
            <footer className="grid grid-cols-2 gap-3 border-t border-slate-200/80 bg-white p-4">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"><Printer className="h-3.5 w-3.5" />Print Statement</button>
              <button type="button" disabled title="Email dispatch is not configured" className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white opacity-60"><Send className="h-3.5 w-3.5" />Dispatch via Email</button>
            </footer>
          </aside>
        </>
      )}
    </main>
  );
}
