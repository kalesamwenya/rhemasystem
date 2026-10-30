'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Clock, CreditCard, HelpCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { openFlutterwaveInlineCheckout, type FlutterwaveInlineCheckout } from '@/lib/flutterwave-inline';
import { uploadVerifiedStudentPaymentReceipt } from '@/lib/payment-receipt';
import ActivityAccessRequest from '@/components/students/ActivityAccessRequest';

type QuizQuestion = {
  id: number;
  question_no: number;
  question: string;
  points: number;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
};

type QuizData = {
  quiz: {
    id: number;
    name: string;
    intro: string;
    timeopen: number;
    timeclose: number;
    timelimit: number;
    grade: number;
    assessment_type: 'quiz' | 'exam';
    attempts: number;
    attempts_used: number;
    best_score: number | null;
    pass_threshold_percent: number;
    passed: boolean;
    payment_required: boolean;
    payment_amount: number;
    payment_currency: string;
    deadline_passed: boolean;
    attempt_started_at: number;
    attempt_expires_at: number;
    attempt_started: boolean;
    can_start_attempt: boolean;
    server_time: number;
  };
  questions: QuizQuestion[];
};

type QuizResponse = { success?: boolean; message?: string; data?: QuizData };

type SubmissionResult = {
  score: number;
  maximum_score: number;
  correct_answers: number;
  question_count: number;
  attempt: number;
  attempt_limit: number;
  passed: boolean;
  pass_threshold_percent: number;
  payment_access_used: boolean;
  time_expired?: boolean;
};

export default function CourseQuizPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = (params?.['course-id'] as string) || '';
  const quizId = searchParams.get('assessment_id') || '';
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [startingAttempt, setStartingAttempt] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const handledReturn = useRef(false);
  const timeoutSubmitted = useRef(false);
  const timerDeadlineMs = useRef(0);
  const activitySessionId = useRef<string | null>(null);

  const trackActivity = useCallback(async (errorMessage: string) => {
    const activityId = quiz?.quiz.id ?? Number(quizId);
    if (!courseId || !Number.isInteger(activityId) || activityId < 1) return;
    try {
      await api.studentActivityLogs.track({
        action: 'error',
        course_id: courseId,
        activity_type: quiz?.quiz.assessment_type ?? 'quiz',
        activity_id: activityId,
        ...(activitySessionId.current ? { session_id: activitySessionId.current } : {}),
        error_message: errorMessage,
      });
      activitySessionId.current = null;
    } catch (cause) {
      console.warn('Could not record quiz activity.', cause);
    }
  }, [courseId, quiz, quizId]);

  const applyQuizData = useCallback((data: QuizData) => {
    setQuiz(data);
    if (data.quiz.attempt_expires_at) {
      const remaining = Math.max(0, data.quiz.attempt_expires_at - (data.quiz.server_time || Math.floor(Date.now() / 1000)));
      timerDeadlineMs.current = Date.now() + remaining * 1000;
      setRemainingSeconds(remaining);
    } else {
      timerDeadlineMs.current = 0;
      setRemainingSeconds(null);
    }
  }, []);

  const loadQuiz = useCallback(async () => {
    if (!courseId || !quizId) return;
    try {
      const response = await api.courses.studentQuiz(courseId, quizId) as QuizResponse;
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load this assessment.');
      applyQuizData(response.data);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this assessment.');
    } finally {
      setLoading(false);
    }
  }, [applyQuizData, courseId, quizId]);

  useEffect(() => {
    let active = true;
    api.courses.studentQuiz(courseId, quizId).then((response: QuizResponse) => {
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to load this assessment.');
      if (active) applyQuizData(response.data);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this assessment.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [applyQuizData, courseId, quizId]);

  useEffect(() => {
    const transactionId = searchParams.get('transaction_id');
    const reference = searchParams.get('tx_ref');
    const paymentStatus = searchParams.get('status');
    if (handledReturn.current || (!transactionId && !paymentStatus)) return;
    handledReturn.current = true;

    const cleanUrl = () => window.history.replaceState({}, '', `${window.location.pathname}?assessment_id=${encodeURIComponent(quizId)}`);
    if (transactionId && reference) {
      queueMicrotask(() => setVerifyingPayment(true));
      api.students.verifyMyPayment(transactionId, reference)
        .then(async (response: { message?: string }) => {
          setNotice(response.message || 'Payment verified. Your assessment access is ready.');
          try {
            await uploadVerifiedStudentPaymentReceipt(reference, transactionId);
          } catch (cause) {
            setError(`Payment verified, but the branded receipt could not be saved: ${cause instanceof Error ? cause.message : 'Please try again from billing.'}`);
          }
          cleanUrl();
          await loadQuiz();
        })
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : 'Payment could not be verified. Assessment access has not been granted.');
          cleanUrl();
        })
        .finally(() => setVerifyingPayment(false));
    } else {
      queueMicrotask(() => {
        setNotice('Payment was not completed. No assessment access has been granted.');
        cleanUrl();
      });
    }
  }, [loadQuiz, quizId, searchParams]);

  const pageSize = 5;
  const pageCount = quiz ? Math.ceil(quiz.questions.length / pageSize) : 0;
  const currentPageIndex = Math.floor(currentQuestionIndex / pageSize);
  const pageStartIndex = currentPageIndex * pageSize;
  const pageQuestions = quiz?.questions.slice(pageStartIndex, pageStartIndex + pageSize) ?? [];
  const canAttempt = Boolean(quiz?.quiz.attempt_started && quiz.questions.length > 0
    && !quiz.quiz.payment_required && !quiz.quiz.passed && quiz.quiz.attempts_used < quiz.quiz.attempts);
  const renderQuestionNavigation = () => (
    <div className="grid grid-cols-5 gap-2" aria-label="Question navigation">
      {quiz?.questions.map((question, index) => {
        const isOnCurrentPage = Math.floor(index / pageSize) === currentPageIndex;
        const isAnswered = Boolean(selectedAnswers[question.id]);
        return (
          <button
            key={question.id}
            type="button"
            onClick={() => setCurrentQuestionIndex(index)}
            aria-label={`Question ${index + 1}${isAnswered ? ', answered' : ', not answered'}`}
            aria-current={isOnCurrentPage ? 'step' : undefined}
            className={`flex h-10 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
              isOnCurrentPage
                ? 'border-blue-900 bg-blue-900 text-white'
                : isAnswered
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {index + 1}
          </button>
        );
      })}
    </div>
  );

  const startAttempt = async () => {
    if (!quiz || startingAttempt || !quiz.quiz.can_start_attempt) return;
    setStartingAttempt(true);
    setError('');
    try {
      const response = await api.courses.startStudentQuiz({
        course_id: courseId,
        quiz_id: quiz.quiz.id,
      }) as { success?: boolean; message?: string; data?: { activity_session_id?: string } };
      if (!response.success) throw new Error(response.message || 'Unable to start this assessment.');
      activitySessionId.current = response.data?.activity_session_id ?? null;
      await loadQuiz();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to start this assessment.';
      setError(message);
      await trackActivity(message);
    } finally {
      setStartingAttempt(false);
    }
  };

  const payForAttempt = async () => {
    if (!quiz || paying) return;
    setPaying(true);
    setError('');
    let paymentReference = '';
    try {
      const response = await api.students.initiateAssessmentPayment({
        course_id: courseId,
        assessment_id: quiz.quiz.id,
        assessment_type: quiz.quiz.assessment_type,
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
          setNotice(verification.message || 'Payment verified. Your assessment access is ready.');
          try {
            await uploadVerifiedStudentPaymentReceipt(response.data.reference, transactionId);
          } catch (cause) {
            setError(`Payment verified, but the branded receipt could not be saved: ${cause instanceof Error ? cause.message : 'Please try again from billing.'}`);
          }
          await loadQuiz();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Payment could not be verified. Assessment access has not been granted.');
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
      setError(cause instanceof Error ? cause.message : 'Unable to start assessment payment.');
      setPaying(false);
    }
  };

  const submitQuiz = useCallback(async (automatic = false) => {
    if (!quiz || submitting || (!automatic && Object.keys(selectedAnswers).length !== quiz.questions.length)) return;
    if (automatic) timeoutSubmitted.current = true;
    setSubmitting(true);
    setError('');
    try {
      if (!activitySessionId.current) {
        const startResponse = await api.courses.startStudentQuiz({
          course_id: courseId,
          quiz_id: quiz.quiz.id,
        }) as { success?: boolean; message?: string; data?: { activity_session_id?: string } };
        if (!startResponse.success) {
          throw new Error(startResponse.message || 'Unable to start this assessment attempt.');
        }
        activitySessionId.current = startResponse.data?.activity_session_id ?? null;
      }
      const response = await api.courses.submitStudentQuiz({
        course_id: courseId,
        quiz_id: quiz.quiz.id,
        answers: selectedAnswers,
      }) as { success?: boolean; message?: string; data?: SubmissionResult };
      if (!response.success || !response.data) throw new Error(response.message || 'Unable to submit your assessment.');
      setResult(response.data);
      activitySessionId.current = null;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Unable to submit your assessment.';
      setError(message);
      await trackActivity(message);
    } finally {
      setSubmitting(false);
    }
  }, [courseId, quiz, selectedAnswers, submitting, trackActivity]);

  useEffect(() => {
    timeoutSubmitted.current = false;
  }, [quizId]);

  const timerRunning = remainingSeconds !== null && remainingSeconds > 0;
  useEffect(() => {
    if (!timerRunning || !canAttempt || result) return;
    const timer = window.setInterval(() => {
      const current = Math.max(0, Math.ceil((timerDeadlineMs.current - Date.now()) / 1000));
      setRemainingSeconds((previous) => previous === current ? previous : current);
    }, 250);
    return () => window.clearInterval(timer);
  }, [timerRunning, canAttempt, result]);

  useEffect(() => {
    if (remainingSeconds === 0 && quiz?.quiz.attempt_expires_at && canAttempt && !timeoutSubmitted.current) {
      void submitQuiz(true);
    }
  }, [remainingSeconds, quiz?.quiz.attempt_expires_at, canAttempt, submitQuiz]);

  if (!courseId || !quizId) return <div role="alert" className="py-10 text-center text-sm text-slate-600">Choose an assessment from your course page to continue.</div>;
  if (loading) return <div className="py-16 text-center text-sm text-slate-500">Loading assessment...</div>;

  if (!quiz) {
    return <div className="mx-auto max-w-2xl space-y-4 py-10">
      <div role="alert" className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{error || 'This assessment has no questions or you have used all allowed attempts.'}</span>
      </div>
    </div>;
  }

  if (result) {
    return <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {result.passed ? <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /> : <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />}
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">{result.passed ? 'Assessment passed' : 'Assessment submitted'}</h1>
          <p className="mt-1 text-sm text-slate-500">{quiz.quiz.name}</p>
        </div>
        <div className="inline-block rounded-xl border border-slate-100 bg-slate-50 px-6 py-3">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</span>
          <span className="text-2xl font-black text-slate-900">{result.score} / {result.maximum_score}</span>
          <span className="mt-1 block text-xs text-slate-500">{result.correct_answers} of {result.question_count} correct</span>
        </div>
        {result.time_expired && <p className="text-xs font-semibold text-amber-800">Time expired. Unanswered questions were marked incorrect.</p>}
        <p className="text-xs text-slate-500">Attempt {result.attempt} of {result.attempt_limit} · Pass mark {result.pass_threshold_percent}%</p>
        {!result.passed && result.attempt < result.attempt_limit && <div className="space-y-3">
          <p className="text-xs text-amber-800">A paid retake is required before the next attempt. Your attempt fee is {new Intl.NumberFormat('en-ZM', { style: 'currency', currency: quiz.quiz.payment_currency }).format(quiz.quiz.payment_amount)}.</p>
          <button type="button" onClick={() => void payForAttempt()} disabled={paying || quiz.quiz.payment_amount <= 0} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50">
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {paying ? 'Connecting to payment...' : 'Pay for retake'}
          </button>
        </div>}
      </div>
    </div>;
  }

  if (quiz.quiz.passed || quiz.quiz.attempts_used >= quiz.quiz.attempts) {
    return <div className="mx-auto max-w-2xl space-y-4 py-10">
      <div role={quiz.quiz.passed ? 'status' : 'alert'} className={`rounded-2xl border p-6 text-center ${quiz.quiz.passed ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
        {quiz.quiz.passed ? <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-700" /> : <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-700" />}
        <p className="text-sm font-bold">{quiz.quiz.passed ? 'You have passed this assessment.' : `You have used all ${quiz.quiz.attempts} attempts allowed for this assessment.`}</p>
        {quiz.quiz.best_score !== null && <p className="mt-2 text-sm font-semibold">Best mark: {quiz.quiz.best_score} / {quiz.quiz.grade} · Pass mark: {quiz.quiz.pass_threshold_percent}%</p>}
        {quiz.quiz.passed && <p className="mt-1 text-xs">No further attempts are required.</p>}
      </div>
    </div>;
  }

  if (quiz.quiz.payment_required) {
    return <div className="mx-auto max-w-2xl space-y-4 py-10">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      <section className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <CreditCard className="mx-auto h-9 w-9 text-amber-700" />
        <div><h1 className="text-lg font-black text-slate-950">Payment required for access</h1>
          <p className="mt-2 text-sm leading-6 text-amber-950">{quiz.quiz.deadline_passed && quiz.quiz.attempts_used === 0 ? 'The deadline has passed; a payment is required before you can start this assessment.' : 'A retake fee is required before this assessment attempt can be opened.'}</p>
          <p className="mt-2 text-xs font-bold text-amber-900">{quiz.quiz.attempts_used} of {quiz.quiz.attempts} attempts used · {quiz.quiz.pass_threshold_percent}% pass mark</p>
          {quiz.quiz.best_score !== null && <p className="mt-1 text-xs font-semibold text-amber-900">Best mark so far: {quiz.quiz.best_score} / {quiz.quiz.grade}</p>}
        </div>
        <p className="text-2xl font-black text-slate-950">{new Intl.NumberFormat('en-ZM', { style: 'currency', currency: quiz.quiz.payment_currency }).format(quiz.quiz.payment_amount)}</p>
        {quiz.quiz.payment_amount > 0 ? <button type="button" onClick={() => void payForAttempt()} disabled={paying || verifyingPayment} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">
          {paying || verifyingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          {verifyingPayment ? 'Verifying payment...' : paying ? 'Connecting to payment...' : 'Pay and unlock attempt'}
        </button> : <p className="text-xs font-semibold text-red-800">The school has not set a fee for this assessment. Contact the school office.</p>}
        <ActivityAccessRequest activityType={quiz.quiz.assessment_type} activityId={quiz.quiz.id} courseId={courseId} activityName={quiz.quiz.name} />
      </section>
    </div>;
  }

  if (!quiz.quiz.attempt_started && quiz.quiz.can_start_attempt) {
    return <div className="mx-auto max-w-2xl space-y-4 py-10">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm">
        <Clock className="mx-auto h-9 w-9 text-blue-900" />
        <div>
          <h1 className="text-lg font-black text-slate-950">{quiz.quiz.name}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">{quiz.quiz.intro.replace(/<[^>]*>/g, ' ')}</p>
          <p className="mt-2 text-xs font-semibold text-slate-500">{quiz.quiz.timelimit > 0 ? `${quiz.quiz.timelimit} minutes` : 'No time limit'} · {quiz.quiz.attempts_used} of {quiz.quiz.attempts} attempts used · Pass mark {quiz.quiz.pass_threshold_percent}%</p>
        </div>
        <button type="button" onClick={() => void startAttempt()} disabled={startingAttempt} className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">
          {startingAttempt ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {startingAttempt ? 'Starting assessment...' : 'Start attempt'}
        </button>
      </section>
    </div>;
  }

  const answeredCount = Object.keys(selectedAnswers).length;
  const formattedTime = remainingSeconds === null
    ? ''
    : `${String(Math.floor(remainingSeconds / 3600)).padStart(2, '0')}:${String(Math.floor((remainingSeconds % 3600) / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`;
  if (!quiz.questions.length) return <div role="alert" className="py-10 text-center text-sm text-slate-600">No questions have been added to this assessment.</div>;

  return <div className="mx-auto max-w-6xl space-y-6 py-6">
    <header className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-blue-900">Course Assessment</span>
        <h1 className="mt-1 text-xl font-black uppercase tracking-tight text-slate-900">{quiz.quiz.name}</h1>
        {quiz.quiz.intro && <p className="mt-1 text-xs text-slate-500">{quiz.quiz.intro.replace(/<[^>]*>/g, ' ')}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {remainingSeconds !== null && (
          <div role="timer" aria-live="off" className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-black ${remainingSeconds <= 60 ? 'bg-red-100 text-red-800' : 'bg-amber-50 text-amber-900'}`}>
            <Clock className="h-3.5 w-3.5" /> {formattedTime} remaining
          </div>
        )}
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-mono font-bold text-slate-600">
          <HelpCircle className="h-3.5 w-3.5" /> Page {currentPageIndex + 1} of {pageCount}
        </div>
      </div>
    </header>

    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800"><AlertCircle className="h-4 w-4" />{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">{notice}</div>}

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
      <div className="space-y-4">
        <nav className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden" aria-label="Assessment questions">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">Question navigation</h2>
            <span className="text-[10px] font-semibold text-slate-500">{answeredCount} / {quiz.questions.length} answered</span>
          </div>
          {renderQuestionNavigation()}
        </nav>

        {pageQuestions.map((question) => (
          <section key={question.id} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700">Question {question.question_no} · {question.points} points</span>
              <p className="text-sm font-bold leading-relaxed text-slate-900">{question.question.replace(/<[^>]*>/g, ' ')}</p>
            </div>
            <div className="grid gap-3">
              {(['A', 'B', 'C', 'D'] as const).map((option) => (
                <button key={option} type="button" disabled={remainingSeconds === 0 || submitting} onClick={() => setSelectedAnswers((answers) => ({ ...answers, [question.id]: option }))}
                  className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${selectedAnswers[question.id] === option ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300'}`}>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 font-mono text-[10px] font-bold text-slate-700">{option}</span>
                  <span>{question.options[option]}</span>
                </button>
              ))}
            </div>
          </section>
        ))}

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-semibold text-slate-500">Page {currentPageIndex + 1} of {pageCount} · {answeredCount} of {quiz.questions.length} answered</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setCurrentQuestionIndex(Math.max(0, pageStartIndex - pageSize))} disabled={currentPageIndex === 0 || remainingSeconds === 0 || submitting} className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-40">
              <ArrowLeft className="h-3.5 w-3.5" /> Previous page
            </button>
            {currentPageIndex < pageCount - 1 ? (
              <button type="button" onClick={() => setCurrentQuestionIndex(pageStartIndex + pageSize)} disabled={remainingSeconds === 0 || submitting} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                Next page <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button type="button" onClick={() => void submitQuiz()} disabled={answeredCount !== quiz.questions.length || submitting || remainingSeconds === 0} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit assessment
              </button>
            )}
          </div>
        </footer>
      </div>

      <aside className="sticky top-6 hidden space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:block" aria-label="Assessment navigation">
        <div>
          <h2 className="text-sm font-black text-slate-900">Question navigation</h2>
          <p className="mt-1 text-xs text-slate-500">{answeredCount} of {quiz.questions.length} answered</p>
        </div>
        {renderQuestionNavigation()}
        <div className="space-y-2 border-t border-slate-100 pt-3 text-[10px] font-medium text-slate-500">
          <p className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-blue-900 bg-blue-900" /> On this page</p>
          <p className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-50" /> Answered</p>
          <p className="flex items-center gap-2"><span className="h-3 w-3 rounded border border-slate-200 bg-white" /> Not answered</p>
        </div>
      </aside>
    </div>
  </div>;
}
