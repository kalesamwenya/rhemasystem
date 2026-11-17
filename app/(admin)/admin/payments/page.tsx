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
  FileText,
  Loader2,
  Printer,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
  X,
  Plus,
  UserRound,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { createPaymentReceiptPdf, type PaymentReceiptData } from '@/lib/payment-receipt';
import { createStudentChargeInvoicePdf } from '@/lib/student-finance-invoice';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';

type PaymentLedgerRecord = Omit<PaymentReceiptData, 'receipt_token'> & {
  id: number;
  description: string;
  receipt_token: string | null;
  receipt_path?: string | null;
  invoice_path?: string | null;
  entry_type: 'charge' | 'payment';
  status: 'posted' | 'pending' | 'paid' | 'failed' | 'void';
  payment_purpose: 'tuition' | 'assessment' | 'liability';
  liability_charge_id?: number | null;
  assessment_type: 'quiz' | 'exam' | 'assignment' | null;
  assessment_id: number | null;
  liability_type: 'tuition' | 'missed_audio' | 'assignment' | 'quiz' | 'exam' | 'other_penalty' | null;
};

type PaymentLedgerResponse = { data: PaymentLedgerRecord[] };
type StudentLookup = { student_id: string; name: string; email?: string; class?: string; account_status?: string };
type StudentsResponse = { data: StudentLookup[] };
type PaymentReceiptsResponse = { data: (PaymentReceiptData & { id: number })[] };
const paymentReceiptFromLedger = (record: PaymentLedgerRecord): PaymentReceiptData & { id: number } => ({
  id: record.id,
  student_name: record.student_name,
  student_id: record.student_id,
  cohort: record.cohort,
  paid_for: record.description,
  term: record.term,
  amount: record.amount,
  currency: record.currency,
  reference: record.reference,
  gateway: record.gateway,
  gateway_transaction_id: record.gateway_transaction_id,
  created_at: record.created_at,
  receipt_token: record.receipt_token || '',
});
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

type PaymentAlert = {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
  reference?: string;
};

const formatMoney = (amount: number, currency: string) =>
  new Intl.NumberFormat('en-ZM', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);

const formatRecordClassification = (record: PaymentLedgerRecord) =>
  [record.payment_purpose, record.liability_type, record.assessment_type, record.term].filter(Boolean).join(' · ') || '—';

const getStatusBadge = (status: PaymentAccount['status']) => {
  switch (status) {
    case 'Settled': return 'border-emerald-100 bg-emerald-50 text-emerald-700';
    case 'Partial Payment': return 'border-amber-100 bg-amber-50 text-amber-700';
    default: return 'border-rose-100 bg-rose-50 text-rose-700';
  }
};

const isAccountPayment = (record: PaymentLedgerRecord) =>
  record.entry_type === 'payment' && record.status === 'paid' && record.payment_purpose === 'tuition';

const isLiabilityPayment = (record: PaymentLedgerRecord) =>
  record.entry_type === 'payment' && record.status === 'paid' && record.payment_purpose === 'liability';

const appliedPaymentTotal = (records: PaymentLedgerRecord[]) =>
  records.filter((record) => isAccountPayment(record) || isLiabilityPayment(record))
    .reduce((total, record) => total + record.amount, 0);

const isTuitionCharge = (record: PaymentLedgerRecord) =>
  record.entry_type === 'charge' && (record.liability_type === null || record.liability_type === 'tuition');

const accountOutstanding = (records: PaymentLedgerRecord[]) => {
  const tuitionCharges = records.filter((record) => record.status === 'posted' && isTuitionCharge(record))
    .reduce((total, record) => total + record.amount, 0);
  const tuitionPaid = records.filter(isAccountPayment).reduce((total, record) => total + record.amount, 0);
  const liabilityDue = records.filter((record) =>
    record.entry_type === 'charge' && record.status === 'posted' && record.liability_type !== null && record.liability_type !== 'tuition'
  ).reduce((total, charge) => {
    const paid = records.filter((payment) =>
      payment.entry_type === 'payment' && payment.status === 'paid' && payment.payment_purpose === 'liability'
      && payment.liability_charge_id === charge.id
    ).reduce((sum, payment) => sum + payment.amount, 0);
    return total + Math.max(0, charge.amount - paid);
  }, 0);
  return Math.max(0, tuitionCharges - tuitionPaid) + liabilityDue;
};

export default function AdminPaymentsPage() {
  const [records, setRecords] = useState<PaymentLedgerRecord[]>([]);
  const [students, setStudents] = useState<StudentLookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [paymentAlert, setPaymentAlert] = useState<PaymentAlert | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cohortFilter, setCohortFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'paid'>('name');
  const [page, setPage] = useState(1);
  const [financeView, setFinanceView] = useState<'records' | 'accounts'>('accounts');
  const [selectedLedgerStudentId, setSelectedLedgerStudentId] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | PaymentLedgerRecord['entry_type']>('all');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | PaymentLedgerRecord['status']>('all');
  const [ledgerSortBy, setLedgerSortBy] = useState<'newest' | 'oldest' | 'status'>('newest');
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerRowsPerPage, setLedgerRowsPerPage] = useState(15);
  const [selectedAccount, setSelectedAccount] = useState<PaymentAccount | null>(null);
  const [statementSearch, setStatementSearch] = useState('');
  const [statementTypeFilter, setStatementTypeFilter] = useState<'all' | PaymentLedgerRecord['entry_type']>('all');
  const [statementStatusFilter, setStatementStatusFilter] = useState<'all' | PaymentLedgerRecord['status']>('all');
  const [statementSortBy, setStatementSortBy] = useState<'newest' | 'oldest' | 'description' | 'status'>('newest');
  const [statementPage, setStatementPage] = useState(1);
  const [statementRowsPerPage, setStatementRowsPerPage] = useState(10);
  const [paymentReceipts, setPaymentReceipts] = useState<(PaymentReceiptData & { id: number })[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const [receiptAction, setReceiptAction] = useState<{ id: number; mode: 'view' | 'download' } | null>(null);
  const [invoiceActionId, setInvoiceActionId] = useState<number | null>(null);
  const [documentError, setDocumentError] = useState('');
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
    if (!paymentAlert) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPaymentAlert(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [paymentAlert]);

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
        if (active) {
          setPaymentAlert({
            tone: 'info',
            title: 'Payment not completed',
            message: 'Flutterwave did not confirm a successful payment. No amount has been credited to the student account.',
            reference,
          });
        }
      });
      return () => { active = false; };
    }
    queueMicrotask(() => {
      if (!active) return;
      setVerifyingFlutterwave(true);
      setError('');
    });
    const completeCheckout = async () => {
      let verifiedPayment: PaymentLedgerRecord | null = null;
      try {
        const verified = await api.students.verifyAdminPayment(transactionId, reference) as { data: PaymentLedgerRecord };
        if (!active) return;
        verifiedPayment = verified.data;
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
          setPaymentAlert({
            tone: 'success',
            title: 'Payment confirmed',
            message: `${formatMoney(verifiedPayment.amount, verifiedPayment.currency)} was verified with Flutterwave and recorded for ${verifiedPayment.student_name}. The receipt is attached to the student account.`,
            reference: verifiedPayment.reference,
          });
        }
      } catch (reason) {
        if (active) {
          const message = reason instanceof Error ? reason.message : 'Could not verify the Flutterwave payment.';
          setError(message);
          setPaymentAlert({
            tone: verifiedPayment ? 'info' : 'error',
            title: verifiedPayment ? 'Payment verified; receipt needs attention' : 'Payment could not be verified',
            message: verifiedPayment
              ? `${formatMoney(verifiedPayment.amount, verifiedPayment.currency)} was verified and recorded for ${verifiedPayment.student_name}, but its receipt could not be prepared: ${message} Check the student ledger before retrying.`
              : `${message} The student account has not been credited.`,
            reference,
          });
        }
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
      const credited = appliedPaymentTotal(studentRecords);
      const balance = accountOutstanding(studentRecords);
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
  const selectedLedgerAccount = accounts.find((account) => account.id === selectedLedgerStudentId) ?? null;
  const selectedStudentLedgerRecords = useMemo(
    () => selectedLedgerStudentId ? records.filter((record) => record.student_id === selectedLedgerStudentId) : [],
    [records, selectedLedgerStudentId],
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
  const filteredLedgerRecords = useMemo(() => {
    const query = ledgerSearch.trim().toLowerCase();
    return selectedStudentLedgerRecords
      .filter((record) => ledgerTypeFilter === 'all' || record.entry_type === ledgerTypeFilter)
      .filter((record) => ledgerStatusFilter === 'all' || record.status === ledgerStatusFilter)
      .filter((record) => !query || [
        record.description,
        record.reference,
        record.payment_purpose,
        record.liability_type,
        record.assessment_type,
        record.term,
        record.gateway,
        record.gateway_transaction_id,
        record.amount,
        record.currency,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
      .sort((left, right) => {
        if (ledgerSortBy === 'oldest') return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (ledgerSortBy === 'status') return left.status.localeCompare(right.status);
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [ledgerSearch, ledgerSortBy, ledgerStatusFilter, ledgerTypeFilter, selectedStudentLedgerRecords]);
  const ledgerPageCount = Math.max(1, Math.ceil(filteredLedgerRecords.length / ledgerRowsPerPage));
  const visibleLedgerPage = Math.min(ledgerPage, ledgerPageCount);
  const pagedLedgerRecords = filteredLedgerRecords.slice(
    (visibleLedgerPage - 1) * ledgerRowsPerPage,
    visibleLedgerPage * ledgerRowsPerPage,
  );
  const filteredStatementRecords = useMemo(() => {
    const query = statementSearch.trim().toLowerCase();
    return [...(selectedAccount?.records ?? [])]
      .filter((record) => statementTypeFilter === 'all' || record.entry_type === statementTypeFilter)
      .filter((record) => statementStatusFilter === 'all' || record.status === statementStatusFilter)
      .filter((record) => !query || [
        record.description,
        record.reference,
        record.payment_purpose,
        record.liability_type,
        record.assessment_type,
        record.term,
        record.gateway,
        record.gateway_transaction_id,
        record.amount,
        record.currency,
      ].some((value) => String(value ?? '').toLowerCase().includes(query)))
      .sort((left, right) => {
        if (statementSortBy === 'oldest') return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (statementSortBy === 'description') return left.description.localeCompare(right.description);
        if (statementSortBy === 'status') return left.status.localeCompare(right.status);
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      });
  }, [selectedAccount, statementSearch, statementSortBy, statementStatusFilter, statementTypeFilter]);
  const statementPageCount = Math.max(1, Math.ceil(filteredStatementRecords.length / statementRowsPerPage));
  const visibleStatementPage = Math.min(statementPage, statementPageCount);
  const pagedStatementRecords = filteredStatementRecords.slice(
    (visibleStatementPage - 1) * statementRowsPerPage,
    visibleStatementPage * statementRowsPerPage,
  );
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
    setStatementSearch('');
    setStatementTypeFilter('all');
    setStatementStatusFilter('all');
    setStatementSortBy('newest');
    setStatementPage(1);
    setPaymentReceipts([]);
    setReceiptError('');
    setDocumentError('');
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
        const credited = appliedPaymentTotal(studentRecords);
        const balance = accountOutstanding(studentRecords);
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
    setDocumentError('');
    setLoadingReceipts(false);
  };

  const openPaymentForSelectedAccount = () => {
    if (!selectedAccount) return;
    const student = students.find((item) => item.student_id === selectedAccount.id) ?? {
      student_id: selectedAccount.id,
      name: selectedAccount.name,
      class: selectedAccount.cohort,
    };
    setPaymentStudent(student);
    setStudentSearch(`${student.name} · ${student.student_id}`);
    setPaymentPurpose('tuition');
    setPaymentDescription(`Tuition payment (${student.class || 'student account'})`);
    setPaymentAmount('');
    setPaymentMethod('flutterwave');
    setExternalReference('');
    setError('');
    setNotice('');
    setManualPaymentOpen(true);
  };

  const downloadStatementRecords = () => {
    if (!selectedAccount) return;
    const quoteCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const records = [...selectedAccount.records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const rows = [
      ['Date', 'Student ID', 'Student', 'Cohort', 'Record type', 'Description', 'Purpose', 'Liability type', 'Assessment type', 'Term', 'Amount', 'Currency', 'Status', 'Reference', 'Payment method', 'Provider transaction reference', 'Related charge ID', 'Receipt available'],
      ...records.map((record) => [
        new Date(record.created_at).toISOString(),
        selectedAccount.id,
        selectedAccount.name,
        selectedAccount.cohort,
        record.entry_type,
        record.description,
        record.payment_purpose,
        record.liability_type,
        record.assessment_type,
        record.term,
        record.amount,
        record.currency,
        record.status,
        record.reference,
        record.gateway,
        record.gateway_transaction_id,
        record.liability_charge_id,
        record.receipt_path || paymentReceipts.some((receipt) => receipt.id === record.id) ? 'Yes' : 'No',
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quoteCsv).join(',')).join('\r\n')}`;
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    const safeStudentId = selectedAccount.id.replace(/[^a-z0-9_-]/gi, '-');
    link.href = url;
    link.download = `Rhema-Financial-Records-${safeStudentId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printStatementRecords = () => {
    if (!selectedAccount) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Allow pop-ups to print this financial statement.');
      return;
    }
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return character;
      }
    });
    const records = [...selectedAccount.records].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const tableRows = records.map((record) => `
      <tr>
        <td>${escapeHtml(new Date(record.created_at).toLocaleString())}</td>
        <td>${escapeHtml(record.entry_type)}</td>
        <td>${escapeHtml(record.description)}</td>
        <td>${escapeHtml(formatRecordClassification(record))}</td>
        <td>${escapeHtml(record.reference)}</td>
        <td>${escapeHtml(formatMoney(record.amount, record.currency))}</td>
        <td>${escapeHtml(record.status)}</td>
        <td>${escapeHtml(record.gateway || '—')}</td>
        <td>${escapeHtml(record.gateway_transaction_id || '—')}</td>
        <td>${record.receipt_path || paymentReceipts.some((receipt) => receipt.id === record.id) ? 'Available' : '—'}</td>
      </tr>`).join('');
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Financial statement — ${escapeHtml(selectedAccount.id)}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        body { color: #172033; font: 11px Arial, sans-serif; }
        h1 { margin: 0 0 4px; font-size: 20px; }
        p { margin: 3px 0; color: #475569; }
        table { width: 100%; margin-top: 18px; border-collapse: collapse; }
        th, td { padding: 7px 6px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
        td { overflow-wrap: anywhere; }
      </style></head><body>
      <h1>Student financial statement</h1>
      <p><strong>${escapeHtml(selectedAccount.name)}</strong> · Student ID ${escapeHtml(selectedAccount.id)} · ${escapeHtml(selectedAccount.cohort || 'Cohort unavailable')}</p>
      <p>Generated ${escapeHtml(new Date().toLocaleString())} · ${records.length} ledger records</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Purpose / classification</th><th>Reference</th><th>Amount</th><th>Status</th><th>Payment method</th><th>Provider reference</th><th>Receipt</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="10">No financial records.</td></tr>'}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const downloadAllLedgerRecords = () => {
    if (!selectedLedgerAccount) return;
    const quoteCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Date', 'Student ID', 'Student', 'Cohort', 'Record type', 'Description', 'Purpose', 'Liability type', 'Assessment type', 'Term', 'Amount', 'Currency', 'Status', 'Reference', 'Payment method', 'Provider transaction reference', 'Related charge ID', 'Receipt available'],
      ...selectedStudentLedgerRecords.map((record) => [
        new Date(record.created_at).toISOString(),
        record.student_id,
        record.student_name,
        record.cohort,
        record.entry_type,
        record.description,
        record.payment_purpose,
        record.liability_type,
        record.assessment_type,
        record.term,
        record.amount,
        record.currency,
        record.status,
        record.reference,
        record.gateway,
        record.gateway_transaction_id,
        record.liability_charge_id,
        record.receipt_path || record.receipt_token ? 'Yes' : 'No',
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(quoteCsv).join(',')).join('\r\n')}`;
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    const safeStudentId = selectedLedgerAccount.id.replace(/[^a-z0-9_-]/gi, '-');
    link.download = `Rhema-Financial-Records-${safeStudentId}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const printAllLedgerRecords = () => {
    if (!selectedLedgerAccount) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Allow pop-ups to print this student’s financial records.');
      return;
    }
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (character) => {
      switch (character) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return character;
      }
    });
    const sortedRecords = [...selectedStudentLedgerRecords].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const tableRows = sortedRecords.map((record) => `
      <tr>
        <td>${escapeHtml(new Date(record.created_at).toLocaleString())}</td>
        <td>${escapeHtml(record.student_name)}<br>${escapeHtml(record.student_id)}</td>
        <td>${escapeHtml(record.cohort || '—')}</td>
        <td>${escapeHtml(record.entry_type)}<br>${escapeHtml(record.description)}</td>
        <td>${escapeHtml([record.payment_purpose, record.liability_type, record.assessment_type, record.term].filter(Boolean).join(' · ') || '—')}</td>
        <td>${escapeHtml(record.reference)}</td>
        <td>${escapeHtml(formatMoney(record.amount, record.currency))}</td>
        <td>${escapeHtml(record.status)}</td>
        <td>${escapeHtml(record.gateway || '—')}<br>${escapeHtml(record.gateway_transaction_id || '')}</td>
      </tr>`).join('');
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html><head><meta charset="utf-8"><title>Financial records — ${escapeHtml(selectedLedgerAccount.id)}</title>
      <style>
        @page { size: landscape; margin: 12mm; }
        body { color: #172033; font: 10px Arial, sans-serif; }
        h1 { margin: 0 0 6px; font-size: 20px; }
        p { margin: 3px 0; color: #475569; }
        table { width: 100%; margin-top: 16px; border-collapse: collapse; }
        th, td { padding: 6px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
        td { overflow-wrap: anywhere; }
      </style></head><body>
      <h1>Student financial records</h1>
      <p><strong>${escapeHtml(selectedLedgerAccount.name)}</strong> · Student ID ${escapeHtml(selectedLedgerAccount.id)} · ${escapeHtml(selectedLedgerAccount.cohort || 'Cohort unavailable')}</p>
      <p>Generated ${escapeHtml(new Date().toLocaleString())} · ${selectedStudentLedgerRecords.length} records</p>
      <table><thead><tr><th>Date</th><th>Student</th><th>Cohort</th><th>Record</th><th>Purpose / classification</th><th>Reference</th><th>Amount</th><th>Status</th><th>Payment method / provider reference</th></tr></thead>
      <tbody>${tableRows || '<tr><td colspan="9">No financial records.</td></tr>'}</tbody></table>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => printWindow.print(), 250);
  };

  const handleReceipt = async (receipt: PaymentReceiptData & { id: number }, mode: 'view' | 'download') => {
    if (receiptAction) return;
    setReceiptAction({ id: receipt.id, mode });
    setReceiptError('');
    const receiptWindow = window.open('about:blank', '_blank');
    if (!receiptWindow) {
      setReceiptAction(null);
      setReceiptError(`Allow pop-ups to ${mode === 'view' ? 'view' : 'download'} the payment receipt.`);
      return;
    }
    receiptWindow.opener = null;
    try {
      const transaction = selectedAccount?.records.find((record) => record.id === receipt.id)
        ?? selectedStudentLedgerRecords.find((record) => record.id === receipt.id)
        ?? records.find((record) => record.id === receipt.id);
      if (!transaction) throw new Error('The payment record could not be found.');
      if (transaction.status !== 'paid' || !transaction.receipt_token) {
        throw new Error('A verified payment is required to generate its receipt.');
      }

      const pdf = await createPaymentReceiptPdf({
        ...receipt,
        receipt_token: transaction.receipt_token,
      });
      const formData = new FormData();
      formData.append('payment_id', String(transaction.id));
      formData.append('status', 'paid');
      formData.append('receipt_token', transaction.receipt_token);
      formData.append('receipt_file', pdf, `Rhema-Receipt-${transaction.reference.replace(/[^a-z0-9_-]/gi, '-')}.pdf`);
      const response = await api.students.updateAdminPaymentStatus(formData) as {
        data: PaymentLedgerRecord;
        message: string;
      };
      const savedTransaction = response.data;
      if (!savedTransaction.receipt_path) throw new Error('The receipt was generated but was not saved to the payment record.');
      setRecords((current) => current.map((record) => record.id === savedTransaction.id ? savedTransaction : record));
      setSelectedAccount((current) => current ? {
        ...current,
        records: current.records.map((record) => record.id === savedTransaction.id ? savedTransaction : record),
      } : current);
      receiptWindow.location.replace(api.students.adminPaymentReceiptUrl(
        savedTransaction.id,
        mode === 'view' ? 'inline' : 'attachment',
      ));
    } catch (reason) {
      receiptWindow.close();
      setReceiptError(reason instanceof Error ? reason.message : 'Unable to download this payment receipt.');
    } finally {
      setReceiptAction(null);
    }
  };

  const handleChargeInvoice = async (charge: PaymentLedgerRecord) => {
    const account = selectedAccount?.id === charge.student_id
      ? selectedAccount
      : accounts.find((item) => item.id === charge.student_id);
    if (!account || invoiceActionId !== null) return;
    setInvoiceActionId(charge.id);
    setDocumentError('');
    try {
      const pdf = await createStudentChargeInvoicePdf({
        student_name: account.name,
        student_id: account.id,
        cohort: account.cohort,
        description: charge.description,
        term: charge.term,
        amount: charge.amount,
        currency: charge.currency,
        reference: charge.reference,
        created_at: charge.created_at,
        verification_url: new URL(`/verify-invoice?reference=${encodeURIComponent(charge.reference)}`, window.location.origin).toString(),
      });
      const response = await api.students.uploadFinanceInvoice(
        charge.id,
        pdf,
        `Rhema-Invoice-${charge.reference.replace(/[^a-z0-9_-]/gi, '-')}.pdf`,
      ) as { message?: string; data?: { path?: string } };
      setRecords((current) => current.map((record) => record.id === charge.id
        ? { ...record, invoice_path: response.data?.path || record.invoice_path }
        : record));
      setSelectedAccount((current) => current ? {
        ...current,
        records: current.id === charge.student_id
          ? current.records.map((record) => record.id === charge.id
            ? { ...record, invoice_path: response.data?.path || record.invoice_path }
            : record)
          : current.records,
      } : current);
      setNotice(response.message || 'Invoice saved and emailed to the student and Finance.');
    } catch (reason) {
      setDocumentError(reason instanceof Error ? reason.message : 'Unable to generate this charge invoice.');
    } finally {
      setInvoiceActionId(null);
    }
  };

  const handleInvoiceFile = (charge: PaymentLedgerRecord, mode: 'view' | 'download') => {
    setDocumentError('');
    const invoiceWindow = window.open(
      api.students.adminFinanceInvoiceUrl(charge.id, mode === 'view' ? 'inline' : 'attachment'),
      '_blank',
    );
    if (!invoiceWindow) {
      setDocumentError(`Allow pop-ups to ${mode === 'view' ? 'view' : 'download'} the saved invoice.`);
      return;
    }
    invoiceWindow.opener = null;
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
            const message = 'Flutterwave returned invalid payment details. The payment has not been confirmed.';
            setError(message);
            setPaymentAlert({
              tone: 'error',
              title: 'Payment could not be verified',
              message,
              reference: response.data.reference,
            });
            setSubmittingPayment(false);
            return;
          }

          setVerifyingFlutterwave(true);
          let verifiedPayment: PaymentLedgerRecord | null = null;
          try {
            const verified = await api.students.verifyAdminPayment(transactionId, response.data.reference) as { data: PaymentLedgerRecord };
            verifiedPayment = verified.data;
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
            if (selectedAccount) void openStatement(selectedAccount);
            setNotice(receiptResult.message || 'Flutterwave payment verified and receipt attached to the student account.');
            setPaymentAlert({
              tone: 'success',
              title: 'Payment confirmed',
              message: `${formatMoney(verifiedPayment.amount, verifiedPayment.currency)} was verified with Flutterwave and recorded for ${verifiedPayment.student_name}. The receipt is attached to the student account.`,
              reference: verifiedPayment.reference,
            });
          } catch (reason) {
            const message = reason instanceof Error ? reason.message : 'Could not verify the Flutterwave payment.';
            setError(message);
            setPaymentAlert({
              tone: verifiedPayment ? 'info' : 'error',
              title: verifiedPayment ? 'Payment verified; receipt needs attention' : 'Payment could not be verified',
              message: verifiedPayment
                ? `${formatMoney(verifiedPayment.amount, verifiedPayment.currency)} was verified and recorded for ${verifiedPayment.student_name}, but its receipt could not be prepared: ${message} Check the student ledger before retrying.`
                : `${message} The student account has not been credited.`,
              reference: response.data.reference,
            });
          } finally {
            setVerifyingFlutterwave(false);
            setSubmittingPayment(false);
          }
        }, () => {
          setSubmittingPayment(false);
          setNotice('Checkout closed. No payment was confirmed.');
          setPaymentAlert({
            tone: 'info',
            title: 'Checkout closed',
            message: 'No payment was confirmed. You can try again whenever you are ready.',
            reference: response.data.reference,
          });
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
      if (selectedAccount) void openStatement(selectedAccount);
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
        const credited = appliedPaymentTotal(updatedRecords);
        const balance = accountOutstanding(updatedRecords);
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
      {paymentAlert && (
        <div
          className="fixed inset-0 z-[11000] flex items-center justify-center bg-slate-950/65 px-4 py-8 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPaymentAlert(null);
          }}
          style={{ animation: 'payment-alert-fade-in 180ms ease-out both' }}
        >
          <style>{`
            @keyframes payment-alert-fade-in { from { opacity: 0; } to { opacity: 1; } }
            @keyframes payment-alert-pop-in { 0% { opacity: 0; transform: translateY(14px) scale(.94); } 70% { opacity: 1; transform: translateY(-2px) scale(1.01); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes payment-alert-icon-in { 0% { opacity: 0; transform: scale(.4) rotate(-18deg); } 70% { opacity: 1; transform: scale(1.12) rotate(4deg); } 100% { opacity: 1; transform: scale(1) rotate(0); } }
            @media (prefers-reduced-motion: reduce) { .payment-alert-motion { animation: none !important; } }
          `}</style>
          <section
            aria-labelledby="payment-alert-title"
            aria-modal="true"
            className="payment-alert-motion relative w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-2xl ring-1 ring-black/5"
            role="alertdialog"
            style={{ animation: 'payment-alert-pop-in 360ms cubic-bezier(.2,.8,.2,1) both' }}
          >
            <div className={`h-1.5 ${paymentAlert.tone === 'success' ? 'bg-emerald-500' : paymentAlert.tone === 'error' ? 'bg-rose-500' : 'bg-amber-400'}`} />
            <button
              aria-label="Close payment message"
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              onClick={() => setPaymentAlert(null)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="px-7 pb-7 pt-8 text-center sm:px-9">
              <div
                className={`payment-alert-motion mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full ${
                  paymentAlert.tone === 'success'
                    ? 'bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60'
                    : paymentAlert.tone === 'error'
                      ? 'bg-rose-50 text-rose-600 ring-8 ring-rose-50/60'
                      : 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/60'
                }`}
                style={{ animation: 'payment-alert-icon-in 520ms cubic-bezier(.2,.8,.2,1) 100ms both' }}
              >
                {paymentAlert.tone === 'success'
                  ? <CheckCircle2 className="h-10 w-10" strokeWidth={1.8} />
                  : <AlertCircle className="h-10 w-10" strokeWidth={1.8} />}
              </div>
              <p className={`mt-7 text-[10px] font-black uppercase tracking-[0.2em] ${
                paymentAlert.tone === 'success' ? 'text-emerald-700' : paymentAlert.tone === 'error' ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {paymentAlert.tone === 'success' ? 'Verified by Flutterwave' : 'Rhema student finance'}
              </p>
              <h2 id="payment-alert-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                {paymentAlert.title}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">{paymentAlert.message}</p>
              {paymentAlert.reference && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Payment reference</p>
                  <p className="mt-1 break-all font-mono text-xs font-bold text-slate-800">{paymentAlert.reference}</p>
                </div>
              )}
              <button
                autoFocus
                className={`mt-6 w-full rounded-xl px-5 py-3 text-sm font-black text-white shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
                  paymentAlert.tone === 'success'
                    ? 'bg-emerald-600 shadow-emerald-900/10 hover:bg-emerald-700 focus-visible:outline-emerald-600'
                    : paymentAlert.tone === 'error'
                      ? 'bg-rose-600 shadow-rose-900/10 hover:bg-rose-700 focus-visible:outline-rose-600'
                      : 'bg-slate-900 shadow-slate-900/10 hover:bg-slate-800 focus-visible:outline-slate-700'
                }`}
                onClick={() => setPaymentAlert(null)}
                type="button"
              >
                {paymentAlert.tone === 'success' ? 'Continue to student accounts' : 'Return to student accounts'}
              </button>
            </div>
          </section>
        </div>
      )}
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

      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4" aria-label="Finance record views">
        <div role="tablist" aria-label="Finance records view" className="flex flex-wrap gap-2">
          <button type="button" role="tab" aria-selected={financeView === 'records'} onClick={() => setFinanceView('records')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${financeView === 'records' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Receipt className="h-4 w-4" />Student financial records <span className={`rounded-full px-2 py-0.5 text-xs ${financeView === 'records' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{records.length.toLocaleString()}</span>
          </button>
          <button type="button" role="tab" aria-selected={financeView === 'accounts'} onClick={() => setFinanceView('accounts')} className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${financeView === 'accounts' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            <UserRound className="h-4 w-4" />Student accounts <span className={`rounded-full px-2 py-0.5 text-xs ${financeView === 'accounts' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600'}`}>{accounts.length.toLocaleString()}</span>
          </button>
        </div>
      </section>

      {financeView === 'records' && (
        <section aria-labelledby="all-financial-records-title" className="fixed inset-0 z-[40] flex h-[100dvh] w-full flex-col bg-slate-50">
          <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8 sm:py-6">
            <div className="mx-auto w-full max-w-screen-2xl">
              <button type="button" onClick={() => setFinanceView('accounts')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"><ChevronLeft className="h-4 w-4" />Back to finance</button>
              <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Finance / Student statement</p>
                  <h1 id="all-financial-records-title" className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Student financial records</h1>
                  <p className="mt-2 text-sm text-slate-600">{selectedLedgerAccount ? `${selectedLedgerAccount.name} · Student ID ${selectedLedgerAccount.id}` : 'Select a student to view their financial records'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
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
                  }} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"><Plus className="h-4 w-4" />Record payment</button>
                  <button type="button" onClick={downloadAllLedgerRecords} disabled={loading || !selectedLedgerAccount || selectedStudentLedgerRecords.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" />Download student records</button>
                  <button type="button" onClick={printAllLedgerRecords} disabled={loading || !selectedLedgerAccount || selectedStudentLedgerRecords.length === 0} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Printer className="h-4 w-4" />Print student records</button>
                </div>
              </div>
            </div>
          </header>
          <div className="mx-auto w-full max-w-screen-2xl flex-1 overflow-y-auto p-5 sm:p-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="Selected student financial records">
              <header className="border-b border-slate-100 px-5 py-5 sm:px-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-slate-600">{selectedLedgerAccount ? `Charges and payments for ${selectedLedgerAccount.name}.` : 'Choose a student to see only their charges and payments.'}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{filteredLedgerRecords.length.toLocaleString()} matching records</span>
            </div>
          </header>
          {(documentError || receiptError) && (
            <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-6">
              {documentError || receiptError}
            </p>
          )}
          <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-[minmax(240px,1fr)_repeat(4,minmax(145px,180px))]">
            <label className="block">
              <span className="sr-only">Select student financial records</span>
              <select value={selectedLedgerStudentId} onChange={(event) => {
                setSelectedLedgerStudentId(event.target.value);
                setLedgerSearch('');
                setLedgerTypeFilter('all');
                setLedgerStatusFilter('all');
                setLedgerPage(1);
                setDocumentError('');
                setReceiptError('');
              }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="">Select a student</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.id}</option>)}
              </select>
            </label>
            <label className="relative block">
              <span className="sr-only">Search selected student financial records</span>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="search" value={ledgerSearch} onChange={(event) => { setLedgerSearch(event.target.value); setLedgerPage(1); }} placeholder="Search reference or description…" disabled={!selectedLedgerStudentId} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" />
            </label>
            <label className="block">
              <span className="sr-only">Filter records by type</span>
              <select value={ledgerTypeFilter} onChange={(event) => { setLedgerTypeFilter(event.target.value as typeof ledgerTypeFilter); setLedgerPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="all">All record types</option><option value="charge">Charges</option><option value="payment">Payments</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Filter records by status</span>
              <select value={ledgerStatusFilter} onChange={(event) => { setLedgerStatusFilter(event.target.value as typeof ledgerStatusFilter); setLedgerPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="all">All statuses</option><option value="posted">Posted</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="void">Void</option>
              </select>
            </label>
            <label className="block">
              <span className="sr-only">Sort selected student financial records</span>
              <select value={ledgerSortBy} onChange={(event) => { setLedgerSortBy(event.target.value as typeof ledgerSortBy); setLedgerPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value="newest">Sort: Newest first</option><option value="oldest">Sort: Oldest first</option><option value="status">Sort: Status</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-500 sm:col-span-2 xl:col-span-5">
              Rows per page
              <select value={ledgerRowsPerPage} onChange={(event) => { setLedgerRowsPerPage(Number(event.target.value)); setLedgerPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                <option value={15}>15</option><option value={25}>25</option><option value={50}>50</option>
              </select>
            </label>
          </div>
          {loading ? (
            <div className="flex min-h-56 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading financial records…</div>
          ) : !selectedLedgerStudentId ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">Select a student to view their financial records.</p>
            </div>
          ) : pagedLedgerRecords.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr><th className="px-4 py-3.5">Date</th><th className="px-4 py-3.5">Record</th><th className="px-4 py-3.5">Reference</th><th className="px-4 py-3.5">Amount</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Payment channel</th><th className="px-4 py-3.5">Documents</th><th className="px-4 py-3.5">Statement</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pagedLedgerRecords.map((record) => {
                    const account = accounts.find((item) => item.id === record.student_id);
                    const receipt = paymentReceipts.find((item) => item.id === record.id)
                      ?? (record.entry_type === 'payment' && record.status === 'paid' && (record.receipt_token || record.receipt_path)
                        ? paymentReceiptFromLedger(record)
                        : null);
                    const selectedStatus = statusDrafts[record.id] ?? record.status;
                    const needsReceipt = selectedStatus === 'paid' && !record.receipt_path;
                    const canSaveStatus = selectedStatus !== record.status || needsReceipt;
                    return (
                      <tr key={`${record.entry_type}-${record.id}`} className="align-top transition-colors hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{new Date(record.created_at).toLocaleString()}</td>
                        <td className="min-w-[230px] px-4 py-4">
                          <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${record.entry_type === 'charge' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>{record.entry_type}</span>
                          <p className="mt-2 font-semibold leading-5 text-slate-950">{record.description}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatRecordClassification(record)}</p>
                        </td>
                        <td className="max-w-[180px] break-all px-4 py-4 font-mono text-xs">{record.reference}</td>
                        <td className="whitespace-nowrap px-4 py-4 font-mono text-sm font-bold text-slate-950">{formatMoney(record.amount, record.currency)}</td>
                        <td className="min-w-[150px] px-4 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${record.status === 'paid' || record.status === 'posted' ? 'bg-emerald-50 text-emerald-700' : record.status === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>{record.status}</span>
                          {record.entry_type === 'payment' && (
                            <div className="mt-3 space-y-2">
                              <label className="sr-only" htmlFor={`ledger-transaction-status-${record.id}`}>Update transaction status</label>
                              <select id={`ledger-transaction-status-${record.id}`} value={selectedStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [record.id]: event.target.value as PaymentLedgerRecord['status'] }))} disabled={updatingPaymentId === record.id} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700">
                                <option value="posted">Posted</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="void">Void</option>
                              </select>
                              {canSaveStatus && <button type="button" onClick={() => void handlePaymentStatusUpdate(record, selectedStatus)} disabled={updatingPaymentId !== null} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{updatingPaymentId === record.id ? 'Saving…' : 'Save status'}</button>}
                            </div>
                          )}
                        </td>
                        <td className="min-w-[150px] px-4 py-4 text-xs text-slate-600">{record.gateway || '—'}{record.gateway_transaction_id && <span className="mt-1 block break-all font-mono text-[10px] text-slate-500">{record.gateway_transaction_id}</span>}</td>
                        <td className="min-w-[170px] px-4 py-4">
                          {record.entry_type === 'charge' ? record.invoice_path ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => handleInvoiceFile(record, 'view')} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50" aria-label={`View invoice for ${record.reference}`}>
                                <Eye className="h-3.5 w-3.5" />View
                              </button>
                              <button type="button" onClick={() => handleInvoiceFile(record, 'download')} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2.5 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50" aria-label={`Download invoice for ${record.reference}`}>
                                <Download className="h-3.5 w-3.5" />PDF
                              </button>
                            </div>
                          ) : record.status === 'posted' ? (
                            <button type="button" onClick={() => void handleChargeInvoice(record)} disabled={invoiceActionId !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-2.5 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-50 disabled:opacity-50" aria-label={`Create invoice for ${record.reference}`}>
                              {invoiceActionId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}Create invoice
                            </button>
                          ) : <span className="text-xs text-slate-400">No invoice</span> : receipt ? (
                            <div className="flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => void handleReceipt(receipt, 'view')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50" aria-label={`View receipt for ${record.reference}`}>
                                {receiptAction?.id === receipt.id && receiptAction.mode === 'view' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}View
                              </button>
                              <button type="button" onClick={() => void handleReceipt(receipt, 'download')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50" aria-label={`Download receipt for ${record.reference}`}>
                                {receiptAction?.id === receipt.id && receiptAction.mode === 'download' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}PDF
                              </button>
                            </div>
                          ) : <span className="text-xs text-slate-400">{record.status === 'pending' ? 'After payment' : 'No receipt'}</span>}
                        </td>
                        <td className="px-4 py-4"><button type="button" disabled={!account} onClick={() => account && void openStatement(account)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-blue-200 px-2.5 py-2 text-xs font-semibold text-blue-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">Open <ArrowUpRight className="h-3.5 w-3.5" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">{selectedStudentLedgerRecords.length ? 'No financial records match these filters.' : 'No financial records are available for this student.'}</p>
              {selectedStudentLedgerRecords.length > 0 && <button type="button" onClick={() => { setLedgerSearch(''); setLedgerTypeFilter('all'); setLedgerStatusFilter('all'); setLedgerPage(1); }} className="mt-3 text-sm font-bold text-blue-800 hover:underline">Clear filters</button>}
            </div>
          )}
          {filteredLedgerRecords.length > 0 && (
            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
              <p className="text-sm text-slate-500">Showing {(visibleLedgerPage - 1) * ledgerRowsPerPage + 1}–{Math.min(visibleLedgerPage * ledgerRowsPerPage, filteredLedgerRecords.length)} of {filteredLedgerRecords.length} matching records</p>
              <div className="flex items-center gap-3">
                <button type="button" disabled={visibleLedgerPage <= 1} onClick={() => setLedgerPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                <span className="whitespace-nowrap text-sm font-semibold text-slate-600">Page {visibleLedgerPage} of {ledgerPageCount}</span>
                <button type="button" disabled={visibleLedgerPage >= ledgerPageCount} onClick={() => setLedgerPage((current) => Math.min(ledgerPageCount, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
              </div>
            </footer>
          )}
            </section>
          </div>
        </section>
      )}

      {financeView === 'accounts' && (
        <>
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
                    <td className="px-4 py-3.5 font-bold text-slate-800"><button type="button" onClick={() => void openStatement(account)} className="text-left hover:text-blue-800 hover:underline">{account.name}</button></td>
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
        </>
      )}

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
        <section aria-label={`Financial record for ${selectedAccount.name}`} className="fixed inset-0 z-[50] flex h-[100dvh] w-full flex-col bg-slate-50">
            <header className="border-b border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-7">
              <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-6">
                <button type="button" onClick={closeStatement} aria-label={financeView === 'accounts' ? 'Back to student accounts' : 'Back to all financial records'} className="inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"><ChevronLeft className="h-4 w-4" />{financeView === 'accounts' ? 'Back to student accounts' : 'Back to all records'}</button>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-800">Finance / Student statement</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Financial record</h1>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusBadge(selectedAccount.status)}`}>{selectedAccount.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{selectedAccount.name} <span className="px-1 text-slate-300">·</span> Student ID {selectedAccount.id}</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedAccount.cohort || 'Cohort unavailable'} <span className="px-1 text-slate-300">·</span> Current term</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={openPaymentForSelectedAccount} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-800"><CreditCard className="h-4 w-4" />Create payment</button>
                    <button type="button" onClick={downloadStatementRecords} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><Download className="h-4 w-4" />Download CSV</button>
                    <button type="button" onClick={printStatementRecords} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"><Printer className="h-4 w-4" />Print all</button>
                  </div>
                </div>
              </div>
            </header>
            <div className="mx-auto grid w-full max-w-screen-2xl flex-1 grid-cols-1 content-start gap-8 overflow-y-auto p-5 sm:p-8 xl:grid-cols-2">
              {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 xl:col-span-2">{error}</div>}
              {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 xl:col-span-2">{notice}</div>}
              <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 xl:col-span-2" aria-label="Account balance summary">
                {(() => {
                  const charges = selectedAccount.records.filter((record) => record.entry_type === 'charge');
                  const postedCharges = charges.filter((record) => record.status === 'posted');
                  const tuitionCharges = postedCharges.filter(isTuitionCharge).reduce((sum, charge) => sum + charge.amount, 0);
                  const tuitionPaid = selectedAccount.records.filter(isAccountPayment).reduce((sum, payment) => sum + payment.amount, 0);
                  const tuitionDue = Math.max(0, tuitionCharges - tuitionPaid);
                  const liabilityBalances = charges.filter((charge) => !isTuitionCharge(charge)).map((charge) => {
                    const relatedPayments = selectedAccount.records.filter((payment) =>
                      payment.entry_type === 'payment' && payment.payment_purpose === 'liability'
                      && payment.liability_charge_id === charge.id
                    );
                    const paid = relatedPayments.filter((payment) => payment.status === 'paid').reduce((sum, payment) => sum + payment.amount, 0);
                    const pending = relatedPayments.filter((payment) => payment.status === 'pending').reduce((sum, payment) => sum + payment.amount, 0);
                    return { charge, paid, pending, due: charge.status === 'posted' ? Math.max(0, charge.amount - paid) : 0 };
                  });
                  const liabilitiesDue = liabilityBalances.reduce((sum, item) => sum + item.due, 0);
                  const totalDue = tuitionDue + liabilitiesDue;
                  return (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Tuition due</p><p className="mt-3 text-xl font-black text-slate-950">{formatMoney(tuitionDue, selectedAccount.currency)}</p></div>
                      <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-amber-800">Liabilities due</p><p className="mt-3 text-xl font-black text-slate-950">{formatMoney(liabilitiesDue, selectedAccount.currency)}</p></div>
                      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-rose-700">Total outstanding</p><p className="mt-3 text-xl font-black text-rose-800">{formatMoney(totalDue, selectedAccount.currency)}</p></div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Posted charges</p><p className="mt-3 text-lg font-black text-slate-950">{formatMoney(selectedAccount.invoiced, selectedAccount.currency)}</p><p className="mt-2 text-xs text-slate-500">{postedCharges.length.toLocaleString()} posted charges</p></div>
                      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Payments applied</p><p className="mt-3 text-lg font-black text-slate-950">{formatMoney(selectedAccount.credited, selectedAccount.currency)}</p><p className="mt-2 text-xs text-slate-500">Confirmed funds credited to the account</p></div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ledger entries</p><p className="mt-3 text-lg font-black text-slate-950">{selectedAccount.records.length.toLocaleString()}</p><p className="mt-2 text-xs text-slate-500">{charges.length.toLocaleString()} charge records, including non-posted entries</p></div>
                    </div>
                  );
                })()}
                {documentError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{documentError}</p>}
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2" aria-label="All financial ledger records">
                <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-7">
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Complete financial ledger</h3>
                    <p className="mt-1.5 text-sm text-slate-500">Review charges and payment transactions, update payment status, and access invoices or receipts.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700">{selectedAccount.records.length.toLocaleString()} records</span>
                </header>
                {receiptError && <p role="alert" className="mx-6 mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:mx-7">{receiptError}</p>}
                <div className="grid gap-3 border-b border-slate-100 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(150px,190px))]">
                  <label className="relative block">
                    <span className="sr-only">Search financial records</span>
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={statementSearch}
                      onChange={(event) => { setStatementSearch(event.target.value); setStatementPage(1); }}
                      placeholder="Search description, reference, amount…"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block">
                    <span className="sr-only">Filter by record type</span>
                    <select value={statementTypeFilter} onChange={(event) => { setStatementTypeFilter(event.target.value as typeof statementTypeFilter); setStatementPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="all">All record types</option>
                      <option value="charge">Charges</option>
                      <option value="payment">Payments</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="sr-only">Filter by payment status</span>
                    <select value={statementStatusFilter} onChange={(event) => { setStatementStatusFilter(event.target.value as typeof statementStatusFilter); setStatementPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="all">All statuses</option>
                      <option value="posted">Posted</option>
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="failed">Failed</option>
                      <option value="void">Void</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="sr-only">Sort financial records</span>
                    <select value={statementSortBy} onChange={(event) => { setStatementSortBy(event.target.value as typeof statementSortBy); setStatementPage(1); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value="newest">Sort: Newest first</option>
                      <option value="oldest">Sort: Oldest first</option>
                      <option value="description">Sort: Description A–Z</option>
                      <option value="status">Sort: Status</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-500 sm:col-span-2 xl:col-span-4">
                    Rows per page
                    <select value={statementRowsPerPage} onChange={(event) => { setStatementRowsPerPage(Number(event.target.value)); setStatementPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </label>
                </div>
                {filteredStatementRecords.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1250px] border-collapse text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4">Date</th>
                          <th className="px-5 py-4">Financial record</th>
                          <th className="px-5 py-4">Reference</th>
                          <th className="px-5 py-4">Amount</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Payment method / provider reference</th>
                          <th className="px-5 py-4">Documents</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {pagedStatementRecords.map((record) => {
                          const receipt = paymentReceipts.find((item) => item.id === record.id);
                          const selectedStatus = statusDrafts[record.id] ?? record.status;
                          const needsReceipt = record.entry_type === 'payment' && selectedStatus === 'paid' && !record.receipt_path;
                          const canSaveStatus = selectedStatus !== record.status || needsReceipt;
                          return (
                            <tr key={`${record.entry_type}-${record.id}`} className="align-top transition-colors hover:bg-slate-50/70">
                              <td className="whitespace-nowrap px-5 py-5 text-xs text-slate-500">{new Date(record.created_at).toLocaleString()}</td>
                              <td className="min-w-[260px] px-5 py-5">
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${record.entry_type === 'charge' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'}`}>{record.entry_type}</span>
                                <p className="mt-2 font-semibold leading-6 text-slate-950">{record.description}</p>
                                <p className="mt-1.5 text-xs text-slate-500">{record.payment_purpose} · {record.liability_type || record.assessment_type || record.term || '—'}</p>
                              </td>
                              <td className="max-w-[220px] break-all px-5 py-5 font-mono text-xs">{record.reference}</td>
                              <td className="whitespace-nowrap px-5 py-5 font-mono text-sm font-bold text-slate-950">{formatMoney(record.amount, record.currency)}</td>
                              <td className="min-w-[180px] px-5 py-5">
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase">{record.status}</span>
                                {record.entry_type === 'payment' && (
                                  <div className="mt-3 space-y-2">
                                    <label className="sr-only" htmlFor={`transaction-status-${record.id}`}>Update transaction status</label>
                                    <select id={`transaction-status-${record.id}`} value={selectedStatus} onChange={(event) => setStatusDrafts((current) => ({ ...current, [record.id]: event.target.value as PaymentLedgerRecord['status'] }))} disabled={updatingPaymentId === record.id} className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700">
                                      <option value="posted">Posted</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="void">Void</option>
                                    </select>
                                    {canSaveStatus && <button type="button" onClick={() => void handlePaymentStatusUpdate(record, selectedStatus)} disabled={updatingPaymentId !== null} className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
                                      {updatingPaymentId === record.id ? 'Saving…' : 'Save status'}
                                    </button>}
                                  </div>
                                )}
                              </td>
                              <td className="min-w-[200px] px-5 py-5 text-xs text-slate-600">{record.gateway || '—'}{record.gateway_transaction_id && <span className="mt-1.5 block break-all font-mono text-[11px] text-slate-500">{record.gateway_transaction_id}</span>}</td>
                              <td className="min-w-[170px] px-5 py-5">
                                {record.entry_type === 'charge' ? record.invoice_path ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => handleInvoiceFile(record, 'view')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                                      <Eye className="h-4 w-4" />View
                                    </button>
                                    <button type="button" onClick={() => handleInvoiceFile(record, 'download')} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50">
                                      <Download className="h-4 w-4" />PDF
                                    </button>
                                  </div>
                                ) : record.status === 'posted' ? (
                                  <button type="button" onClick={() => void handleChargeInvoice(record)} disabled={invoiceActionId !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-900 hover:bg-blue-50 disabled:opacity-50">
                                    {invoiceActionId === record.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}Create invoice
                                  </button>
                                ) : <span className="text-xs text-slate-400">No invoice</span> : receipt ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => void handleReceipt(receipt, 'view')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                                      {receiptAction?.id === receipt.id && receiptAction.mode === 'view' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}View
                                    </button>
                                    <button type="button" onClick={() => void handleReceipt(receipt, 'download')} disabled={receiptAction?.id === receipt.id} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50">
                                      {receiptAction?.id === receipt.id && receiptAction.mode === 'download' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}PDF
                                    </button>
                                  </div>
                                ) : loadingReceipts && record.status === 'paid' ? <span className="text-xs text-slate-400">Loading receipt…</span> : <span className="text-xs text-slate-400">No receipt</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">{selectedAccount.records.length ? 'No records match these filters.' : 'No financial records are available for this account.'}</p>
                    {selectedAccount.records.length > 0 && <button type="button" onClick={() => { setStatementSearch(''); setStatementTypeFilter('all'); setStatementStatusFilter('all'); setStatementPage(1); }} className="mt-3 text-sm font-bold text-blue-800 hover:underline">Clear filters</button>}
                  </div>
                )}
                {filteredStatementRecords.length > 0 && (
                  <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 sm:px-6">
                    <p className="text-sm text-slate-500">
                      Showing {(visibleStatementPage - 1) * statementRowsPerPage + 1}–{Math.min(visibleStatementPage * statementRowsPerPage, filteredStatementRecords.length)} of {filteredStatementRecords.length} matching records
                      {filteredStatementRecords.length !== selectedAccount.records.length && ` · ${selectedAccount.records.length} total`}
                    </p>
                    <div className="flex items-center gap-3">
                      <button type="button" disabled={visibleStatementPage <= 1} onClick={() => setStatementPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                      <span className="whitespace-nowrap text-sm font-semibold text-slate-600">Page {visibleStatementPage} of {statementPageCount}</span>
                      <button type="button" disabled={visibleStatementPage >= statementPageCount} onClick={() => setStatementPage((current) => Math.min(statementPageCount, current + 1))} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                    </div>
                  </footer>
                )}
              </section>
            </div>
            <footer className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
              <p className="text-sm text-slate-500">Complete statement · {selectedAccount.records.length.toLocaleString()} ledger records</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadStatementRecords} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"><Download className="h-4 w-4" />Download all records</button>
                <button type="button" onClick={printStatementRecords} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"><Printer className="h-4 w-4" />Print all records</button>
              </div>
            </footer>
        </section>
      )}
    </main>
  );
}
