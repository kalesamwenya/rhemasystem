'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock, CreditCard, FileText, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Loading text editor...</div>,
});

const editorModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
};

const editorFormats = ['header', 'bold', 'italic', 'underline', 'blockquote', 'list', 'bullet', 'link'];

type AssignmentRecord = {
  id: number;
  name: string;
  intro: string;
  course_id: string;
  course_name: string;
  allowsubmissionsfromdate: number;
  duedate: number;
  not_open: boolean;
  closed: boolean;
  grade: number;
  submission_type: string;
  submission_text: string | null;
  submitted_at: string | null;
  submission_count: number;
  grading_rubric: { name: string; description: string; points: number }[];
  payment_required: boolean;
  payment_amount: number;
  payment_currency: string;
  paid_access: boolean;
};

type AssignmentResponse = { success?: boolean; message?: string; data?: AssignmentRecord };

const hasSubmissionContent = (html: string) =>
  html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/gi, ' ').trim().length > 0;

export default function AssignmentSubmissionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = (params?.['course-id'] as string) || '';
  const assignmentId = searchParams.get('assessment_id') || '';
  const [assignment, setAssignment] = useState<AssignmentRecord | null>(null);
  const [textSubmission, setTextSubmission] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const handledReturn = useRef(false);

  const loadAssignment = useCallback(async () => {
    if (!courseId || !assignmentId) return;
    try {
      const response = await api.courses.studentAssignment(courseId, assignmentId) as AssignmentResponse;
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load this assignment.');
      setAssignment(response.data);
      setTextSubmission(response.data.submission_text || '');
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this assignment.');
    } finally {
      setLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    let active = true;
    api.courses.studentAssignment(courseId, assignmentId).then((response: AssignmentResponse) => {
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load this assignment.');
      if (!active) return;
      setAssignment(response.data);
      setTextSubmission(response.data.submission_text || '');
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this assignment.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [courseId, assignmentId]);

  useEffect(() => {
    const transactionId = searchParams.get('transaction_id');
    const reference = searchParams.get('tx_ref');
    const paymentStatus = searchParams.get('status');
    if (handledReturn.current || (!transactionId && !paymentStatus)) return;
    handledReturn.current = true;

    const cleanUrl = () => window.history.replaceState({}, '', `${window.location.pathname}?assessment_id=${encodeURIComponent(assignmentId)}`);
    if (transactionId && reference) {
      queueMicrotask(() => setVerifyingPayment(true));
      api.students.verifyMyPayment(transactionId, reference)
        .then(async (response: { message?: string }) => {
          setNotice(response.message || 'Payment verified. Your assignment submission is unlocked.');
          cleanUrl();
          await loadAssignment();
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'Payment could not be verified. Submission access has not been granted.');
          cleanUrl();
        })
        .finally(() => setVerifyingPayment(false));
    } else {
      queueMicrotask(() => {
        setNotice('Payment was not completed. No submission access has been granted.');
        cleanUrl();
      });
    }
  }, [assignmentId, loadAssignment, searchParams]);

  const payForSubmission = async () => {
    if (!assignment || paying) return;
    setPaying(true);
    setError('');
    let paymentReference = '';
    try {
      const response = await api.students.initiateAssessmentPayment({
        course_id: courseId,
        assessment_id: assignment.id,
        assessment_type: 'assignment',
      }) as { data: FlutterwaveInlineCheckout };
      paymentReference = response.data.reference;
      await openFlutterwaveInlineCheckout(response.data, async (transaction) => {
        if (transaction.status !== 'successful') {
          try {
            await api.students.cancelAssessmentPayment(paymentReference);
            setNotice('Payment was not completed. You can try again when ready.');
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Payment was not completed, but the pending payment could not be cancelled.');
          } finally {
            setPaying(false);
          }
          return;
        }
        const transactionId = String(transaction.transaction_id ?? '');
        if (!/^\d+$/.test(transactionId) || transaction.tx_ref !== response.data.reference) {
          setError('Flutterwave returned invalid payment details. The payment has not been confirmed.');
          setPaying(false);
          return;
        }
        setVerifyingPayment(true);
        try {
          const verification = await api.students.verifyMyPayment(transactionId, response.data.reference) as { message?: string };
          setNotice(verification.message || 'Payment verified. Your assignment submission is unlocked.');
          await loadAssignment();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Payment could not be verified. Submission access has not been granted.');
        } finally {
          setVerifyingPayment(false);
          setPaying(false);
        }
      }, () => {
        void api.students.cancelAssessmentPayment(paymentReference)
          .then(() => setNotice('Checkout closed. No payment was confirmed; you can try again when ready.'))
          .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Checkout closed, but the pending payment could not be cancelled.'))
          .finally(() => setPaying(false));
      });
    } catch (cause) {
      if (paymentReference) {
        try {
          await api.students.cancelAssessmentPayment(paymentReference);
        } catch (cancelCause) {
          setError(cancelCause instanceof Error ? cancelCause.message : 'Unable to cancel the pending assessment payment.');
          setPaying(false);
          return;
        }
      }
      setError(cause instanceof Error ? cause.message : 'Unable to start the assignment payment.');
      setPaying(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!assignment || !hasSubmissionContent(textSubmission)) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const response = await api.courses.saveStudentAssignment({
        course_id: courseId,
        assignment_id: assignment.id,
        submission_text: textSubmission,
      }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'Unable to save this assignment.');
      setSaved(true);
      setAssignment((current) => current ? {
        ...current,
        submission_text: textSubmission,
        submitted_at: new Date().toISOString(),
        submission_count: current.submission_count + 1,
        payment_required: false,
        paid_access: false,
      } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this assignment.');
    } finally {
      setSaving(false);
    }
  };

  if (!courseId || !assignmentId) return <div role="alert" className="py-10 text-center text-sm text-slate-600">Choose an assignment from your course page to continue.</div>;
  if (loading) return <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading assignment...</div>;
  if (!assignment) return <div role="alert" className="py-10 text-center text-sm text-red-800">{error || 'Assignment not found.'}</div>;

  return <div className="mx-auto max-w-4xl space-y-6 py-6">
    <header className="border-b border-slate-200 pb-4">
      <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-900">{assignment.course_name} · Assignment</div>
      <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{assignment.name}</h1>
      {assignment.intro && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{assignment.intro.replace(/<[^>]*>/g, ' ')}</p>}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Maximum grade: {assignment.grade}</span>
        <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Due: {assignment.duedate ? new Date(assignment.duedate * 1000).toLocaleString() : 'No due date'}</span>
        <span>Submissions: {assignment.submission_count}</span>
      </div>
    </header>

    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}
    {notice && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><CheckCircle className="h-4 w-4" />{notice}</div>}
    {saved && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800"><CheckCircle className="h-4 w-4" />Submission saved to your student record.</div>}
    {assignment.submitted_at && <p className="text-xs font-medium text-slate-500">Last submitted: {new Date(assignment.submitted_at).toLocaleString()}</p>}
    {assignment.grading_rubric.length > 0 && (
      <section className="space-y-3 rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-black text-slate-900">Grading rubric</h2><p className="mt-1 text-xs text-slate-500">How your assignment will be evaluated.</p></div>
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-800">{assignment.grade} points total</span>
        </div>
        <div className="divide-y divide-slate-100">
          {assignment.grading_rubric.map((criterion, index) => (
            <div key={`${criterion.name}-${index}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div><h3 className="text-xs font-bold text-slate-800">{criterion.name}</h3>{criterion.description && <p className="mt-1 text-xs leading-5 text-slate-500">{criterion.description}</p>}</div>
              <span className="shrink-0 text-xs font-black text-blue-900">{criterion.points} pts</span>
            </div>
          ))}
        </div>
      </section>
    )}

    {assignment.not_open ? (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">Submissions are not open yet.</div>
    ) : assignment.payment_required ? (
      <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <CreditCard className="mx-auto h-9 w-9 text-amber-700" />
        <div><h2 className="text-lg font-black text-slate-950">Payment required to submit</h2>
          <p className="mt-2 text-sm leading-6 text-amber-950">{assignment.closed && assignment.submission_count === 0 ? 'The deadline has passed. Pay to make a late initial submission.' : 'Assignment resubmissions require a fee. Pay to unlock your next submission.'}</p>
        </div>
        <p className="text-2xl font-black text-slate-950">{new Intl.NumberFormat('en-ZM', { style: 'currency', currency: assignment.payment_currency }).format(assignment.payment_amount)}</p>
        {assignment.payment_amount > 0 ? <button type="button" onClick={() => void payForSubmission()} disabled={paying || verifyingPayment} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">
          {paying || verifyingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {verifyingPayment ? 'Verifying payment...' : paying ? 'Connecting to payment...' : 'Pay and unlock submission'}
        </button> : <p className="text-xs font-semibold text-red-800">The school has not set an assignment fee. Contact the school office.</p>}
      </section>
    ) : (
      <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Assignment response</label><p className="mt-1 text-xs text-slate-500">Use the editor to format your answer. Changes are saved when you submit.</p></div>
        <div className="overflow-hidden rounded-xl border border-slate-200 [&_.ql-container]:min-h-[280px] [&_.ql-editor]:text-sm [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-0">
          <ReactQuill theme="snow" value={textSubmission} onChange={setTextSubmission} modules={editorModules} formats={editorFormats} readOnly={saving} placeholder="Write your assignment response..." />
        </div>
        {assignment.closed && <p className="text-xs font-semibold text-amber-800">This is a late submission. A paid late-submission authorization has unlocked the editor.</p>}
        {assignment.paid_access && <p className="text-xs font-semibold text-emerald-800">Verified payment has unlocked one submission. The authorization is used when you submit.</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={!hasSubmissionContent(textSubmission) || saving} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 text-amber-400" />}
            {saving ? 'Saving...' : assignment.submission_count ? 'Submit paid resubmission' : 'Submit assignment'}
          </button>
        </div>
      </form>
    )}
  </div>;
}
