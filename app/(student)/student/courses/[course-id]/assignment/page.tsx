'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Clock, CreditCard, FileText, Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { assignmentTextParagraphs, splitAnnotatedText, type AssignmentAnnotation } from '@/lib/assignment-annotations';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';
import { uploadVerifiedStudentPaymentReceipt } from '@/lib/payment-receipt';
import ActivityAccessRequest from '@/components/students/ActivityAccessRequest';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(async () => {
  const quillModule = await import('react-quill-new');
  const fontFormat = quillModule.Quill.import('attributors/style/font') as { whitelist?: string[] };
  fontFormat.whitelist = ['Arial', 'Times New Roman', 'Calibri'];
  quillModule.Quill.register('attributors/style/font', fontFormat, true);
  const sizeFormat = quillModule.Quill.import('attributors/style/size') as { whitelist?: string[] };
  sizeFormat.whitelist = ['12pt', '14pt', '16pt'];
  quillModule.Quill.register('attributors/style/size', sizeFormat, true);
  return quillModule.default;
}, {
  ssr: false,
  loading: () => <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">Loading text editor...</div>,
});

const editorModules = {
  toolbar: [
    [{ font: ['Arial', 'Times New Roman', 'Calibri'] }],
    [{ size: ['12pt', '14pt', '16pt'] }],
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'clean'],
  ],
};

const editorFormats = ['font', 'size', 'header', 'bold', 'italic', 'underline', 'blockquote', 'list', 'bullet', 'link'];

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
  student_grade: number | null;
  lecturer_feedback: string;
  lecturer_annotations: AssignmentAnnotation[];
  graded_at: string | null;
  passed: boolean;
  can_resubmit: boolean;
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
  const activitySessionId = useRef<string | null>(null);
  const activityStartRequest = useRef<Promise<string | null> | null>(null);
  const submittedParagraphs = assignmentTextParagraphs(assignment?.submission_text);

  const startActivity = useCallback(async () => {
    if (activitySessionId.current) return activitySessionId.current;
    if (activityStartRequest.current) return activityStartRequest.current;
    const activityNumber = assignment?.id ?? Number(assignmentId);
    if (!courseId || !Number.isInteger(activityNumber) || activityNumber < 1) return null;

    activityStartRequest.current = (async () => {
      try {
        const response = await api.studentActivityLogs.track({
          action: 'start',
          course_id: courseId,
          activity_type: 'assignment',
          activity_id: activityNumber,
        }) as { data?: { session_id?: string } };
        activitySessionId.current = response.data?.session_id ?? null;
        return activitySessionId.current;
      } catch (cause) {
        console.warn('Could not record assignment activity start.', cause);
        return null;
      } finally {
        activityStartRequest.current = null;
      }
    })();
    return activityStartRequest.current;
  }, [assignment?.id, assignmentId, courseId]);

  const finishActivity = useCallback(async (errorMessage: string) => {
    const activityNumber = assignment?.id ?? Number(assignmentId);
    if (!courseId || !Number.isInteger(activityNumber) || activityNumber < 1) return;
    try {
      await api.studentActivityLogs.track({
        action: 'error',
        course_id: courseId,
        activity_type: 'assignment',
        activity_id: activityNumber,
        ...(activitySessionId.current ? { session_id: activitySessionId.current } : {}),
        ...(errorMessage ? { error_message: errorMessage } : {}),
      });
    } catch (cause) {
      console.warn('Could not record assignment activity result.', cause);
    } finally {
      activitySessionId.current = null;
    }
  }, [assignment?.id, assignmentId, courseId]);

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
          try {
            await uploadVerifiedStudentPaymentReceipt(reference, transactionId);
          } catch (cause) {
            setError(`Payment verified, but the branded receipt could not be saved: ${cause instanceof Error ? cause.message : 'Please try again from billing.'}`);
          }
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
    if (!assignment || paying || !assignment.payment_required) return;
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
          try {
            await uploadVerifiedStudentPaymentReceipt(response.data.reference, transactionId);
          } catch (cause) {
            setError(`Payment verified, but the branded receipt could not be saved: ${cause instanceof Error ? cause.message : 'Please try again from billing.'}`);
          }
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
    await startActivity();
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
        student_grade: null,
        lecturer_feedback: '',
        lecturer_annotations: [],
        graded_at: null,
        passed: false,
        can_resubmit: false,
        payment_required: false,
        paid_access: false,
      } : current);
      activitySessionId.current = null;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to save this assignment.';
      setError(message);
      await finishActivity(message);
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
    {assignment.submission_text && <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-black text-slate-900">Your submission</h2>
        <p className="mt-1 text-xs text-slate-500">Submitted {assignment.submitted_at ? new Date(assignment.submitted_at).toLocaleString() : '—'}</p>
      </div>
      <div className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {submittedParagraphs.map((paragraph, paragraphIndex) => (
          <p key={paragraphIndex} className="mb-3 last:mb-0">
            {splitAnnotatedText(paragraph, paragraphIndex, assignment.lecturer_annotations).map((segment, segmentIndex) => {
              if (!segment.annotations.length) return <span key={`${segmentIndex}-${segment.text}`}>{segment.text}</span>;
              const comment = segment.annotations.find((annotation) => annotation.kind === 'comment' && annotation.comment);
              return <mark
                key={`${segmentIndex}-${segment.text}`}
                title={comment?.comment || 'Lecturer highlight'}
                className={`rounded px-0.5 ${comment ? 'bg-sky-200 text-slate-950 underline decoration-blue-700 decoration-2 underline-offset-2' : 'bg-yellow-200 text-slate-950'}`}
                data-annotation-ids={segment.annotations.map((annotation) => annotation.id).join(' ')}
              >{segment.text}</mark>;
            })}
          </p>
        ))}
      </div>
    </section>}
    {assignment.submission_count > 0 && <section className={`space-y-3 rounded-2xl border p-5 shadow-sm ${assignment.passed ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3">
        {assignment.passed && <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />}
        <div>
          <h2 className="text-sm font-black text-slate-900">{assignment.student_grade === null ? 'Awaiting lecturer marking' : assignment.passed ? 'Assignment passed' : 'Resubmission required'}</h2>
          {assignment.student_grade !== null && <p className="mt-1 text-sm font-bold text-slate-800">Your mark: {assignment.student_grade} / {assignment.grade} · Pass mark: 60%</p>}
          {assignment.graded_at && <p className="mt-1 text-xs text-slate-500">Marked {new Date(assignment.graded_at).toLocaleString()}</p>}
        </div>
      </div>
      {assignment.lecturer_feedback && <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Lecturer feedback</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{assignment.lecturer_feedback}</p>
      </div>}
      {assignment.lecturer_annotations.filter((annotation) => annotation.kind === 'comment' && annotation.comment).map((annotation) => (
        <blockquote key={annotation.id} className="rounded-xl border-l-4 border-blue-500 bg-white p-4 text-sm text-slate-700">
          {annotation.quote && <p className="font-semibold">“{annotation.quote}”</p>}
          <p className={annotation.quote ? 'mt-2' : ''}>{annotation.comment}</p>
          <button
            type="button"
            onClick={() => Array.from(document.querySelectorAll<HTMLElement>('[data-annotation-ids]'))
              .find((element) => element.dataset.annotationIds?.split(' ').includes(annotation.id))
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="mt-2 text-xs font-bold text-blue-700 underline underline-offset-2"
          >View highlighted passage</button>
        </blockquote>
      ))}
    </section>}
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
        <ActivityAccessRequest activityType="assignment" activityId={assignment.id} courseId={courseId} activityName={assignment.name} />
      </section>
    ) : assignment.can_resubmit ? (
      <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Assignment response</label><p className="mt-1 text-xs text-slate-500">Use the editor to format your answer. The default is Arial, 14 pt. Changes are saved when you submit.</p></div>
        <div className="overflow-hidden rounded-xl border border-slate-200 [&_.ql-container]:min-h-[280px] [&_.ql-editor]:[font-family:Arial] [&_.ql-editor]:text-[14pt] [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-slate-200 [&_.ql-toolbar]:bg-slate-50 [&_.ql-container]:border-0">
          <ReactQuill
            theme="snow"
            value={textSubmission}
            onChange={(value) => {
              setTextSubmission(value);
              void startActivity();
            }}
            modules={editorModules}
            formats={editorFormats}
            readOnly={saving}
            placeholder="Write your assignment response..."
          />
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
    ) : assignment.submission_count > 0 && assignment.student_grade === null ? (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Your submitted work is locked while your lecturer reviews it.</p>
    ) : assignment.passed ? (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900">You have passed this assignment. No resubmission is needed.</p>
    ) : null}
  </div>;
}
