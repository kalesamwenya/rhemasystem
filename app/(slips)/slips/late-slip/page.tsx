'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import SlipFeedbackAlert from '@/components/slips/SlipFeedbackAlert';
import { usePublicSlipStudent } from '@/components/slips/usePublicSlipStudent';

const steps = ['Student details', 'Reason & audio', 'Authorization'];
const inputClass = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-red-600 focus:ring-4 focus:ring-red-100';
const labelClass = 'block text-sm font-bold text-slate-800';

type Feedback = {
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  actionHref?: string;
  actionText?: string;
};

type SessionInfo = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  course_name: string;
  cohort_name: string;
};

type SlipResponse = {
  data?: {
    student_name: string;
    course_name: string;
    cohort_name: string;
    late_seconds: number;
    late_minutes: number;
    requires_audio_purchase: boolean;
    audio_configured: boolean;
    audio_purchased: boolean;
    audio_title: string | null;
    audio_price: number | null;
    audio_currency: string | null;
  };
};

function localTime() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
}

export default function LateSlipPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [reasons, setReasons] = useState('');
  const [audioAcknowledgement, setAudioAcknowledgement] = useState('');
  const [administrationAuthorization, setAdministrationAuthorization] = useState('');
  const [arrivalTime, setArrivalTime] = useState(() => localTime());
  const [step, setStep] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const fillStudentDetails = useCallback((student: { name: string; email: string }) => {
    const nameParts = student.name.trim().split(/\s+/);
    setFirstName(nameParts[0] || '');
    setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : '');
    setEmail(student.email || '');
    setLoadingSessions(true);
  }, []);
  const studentLookup = usePublicSlipStudent(studentId, fillStudentDetails);

  useEffect(() => {
    const clock = window.setInterval(() => setArrivalTime(localTime()), 30000);
    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    if (studentLookup.state !== 'found' || !studentId.trim()) return;

    let active = true;
    api.attendance.publicSlipSessions(studentId.trim())
      .then((response: { data?: { sessions?: SessionInfo[] } }) => {
        if (!active) return;
        if (!Array.isArray(response.data?.sessions)) throw new Error('The current session list was incomplete.');
        setSessions(response.data.sessions);
      })
      .catch((cause: unknown) => {
        if (active) setFeedback({
          type: 'error',
          title: 'Unable to load current sessions',
          message: cause instanceof Error ? cause.message : 'Unable to load your current class sessions.',
        });
      })
      .finally(() => { if (active) setLoadingSessions(false); });
    return () => { active = false; };
  }, [studentId, studentLookup.state]);

  const validateStep = (index: number) => {
    const panel = formRef.current?.querySelector<HTMLElement>(`[data-wizard-step="${index}"]`);
    const requiredControls = panel?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(':required');
    if (requiredControls && Array.from(requiredControls).some((control) => !control.checkValidity())) {
      setFeedback({
        type: 'error',
        title: 'Check the required fields',
        message: 'Complete each required field on this step before continuing.',
      });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (validateStep(step)) setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validateStep(step)) return;
    if (!session || !sessionId) {
      setFeedback({ type: 'error', title: 'Choose your current class session', message: 'Select the class session taking place now before continuing.' });
      return;
    }
    setSaving(true);
    try {
      const response = await api.attendance.submitStudentSlip({
        type: 'late_slip',
        session_id: sessionId,
        student_id: studentId.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        reasons: reasons.trim(),
        audio_acknowledgement: audioAcknowledgement,
        administration_authorization: administrationAuthorization.trim(),
      }) as SlipResponse;
      if (!response.data) throw new Error('The school system did not confirm the late slip.');
      const result = response.data;
      const details = [
        `Recorded for ${result.student_name}.`,
        `${result.course_name} · ${result.cohort_name} · ${result.late_minutes} minute${result.late_minutes === 1 ? '' : 's'} late.`,
        result.requires_audio_purchase
          ? `Required audio: ${result.audio_title || 'session audio'}${result.audio_price !== null ? ` · ${result.audio_currency || ''} ${result.audio_price.toFixed(2)}` : ''}. A notification has been sent to your student account.`
          : result.audio_purchased
            ? 'You already have access to the required audio; no further purchase is needed.'
            : !result.audio_configured
              ? 'The required audio is not configured. Student Affairs has been notified.'
              : result.late_seconds < 300
                ? 'No audio purchase is required before five minutes of lateness.'
                : 'No further audio purchase is required.',
      ];
      setFeedback({
        type: result.requires_audio_purchase || !result.audio_configured ? 'warning' : 'success',
        title: result.requires_audio_purchase ? 'Slip recorded — audio purchase required' : 'Late slip submitted successfully',
        message: details.join('\n'),
        ...(result.requires_audio_purchase ? {
          actionHref: '/student/library',
          actionText: 'Open student library',
        } : {}),
      });
    } catch (cause) {
      setFeedback({
        type: 'error',
        title: 'Unable to submit slip',
        message: cause instanceof Error ? cause.message : 'Unable to submit this late slip.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-sky-300"><Clock3 className="h-6 w-6" /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Student Affairs · Class attendance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Late slip</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Enter your student number, choose the class session taking place now, and record your arrival.</p>
        </header>

        {session && (
          <section className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-sky-800">Selected current class session</p>
                <h2 className="mt-1 text-lg font-black">{session.course_name}</h2>
                <p className="mt-1 text-sm">{session.cohort_name} · {session.session_date} · {session.start_time}–{session.end_time}</p>
              </div>
              <div className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-bold text-sky-950">
                Arrival time <span className="ml-1 tabular-nums">{arrivalTime}</span>
              </div>
            </div>
          </section>
        )}

        <form ref={formRef} noValidate onSubmit={submit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
            <ol aria-label="Form progress" className="grid grid-cols-3 gap-2">
              {steps.map((title, index) => (
                <li key={title} className={`flex items-center gap-2 text-xs font-bold sm:text-sm ${index <= step ? 'text-red-800' : 'text-slate-400'}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index < step ? 'bg-red-800 text-white' : index === step ? 'bg-red-100 text-red-900 ring-2 ring-red-700' : 'bg-slate-200 text-slate-500'}`}>
                    {index < step ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  <span>{title}</span>
                </li>
              ))}
            </ol>
          </div>

          <section data-wizard-step={0} hidden={step !== 0} className="space-y-5 p-5 sm:p-8">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Student details</h2>
                  <p className="mt-1 text-sm text-slate-500">Enter your active student details, then select the class session taking place now.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>Student number <span className="text-red-600">*</span><input required maxLength={50} autoComplete="off" value={studentId} onChange={(event) => { setStudentId(event.target.value); setFirstName(''); setLastName(''); setEmail(''); setSessionId(''); setSession(null); setSessions([]); setLoadingSessions(false); }} className={inputClass} />
                    {studentLookup.state === 'loading' && <span className="mt-1 block text-xs font-medium text-slate-500">Looking up student…</span>}
                    {studentLookup.state === 'found' && <span className="mt-1 block text-xs font-medium text-emerald-700">Student record found. Details filled in.</span>}
                    {(studentLookup.state === 'not-found' || studentLookup.state === 'error') && <span role="status" className="mt-1 block text-xs font-medium text-red-700">{studentLookup.error}</span>}
                  </label>
                  <label className={labelClass}>Surname <span className="text-red-600">*</span><input required maxLength={120} autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>First name <span className="text-red-600">*</span><input required maxLength={120} autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>Email <span className="text-red-600">*</span><input required type="email" maxLength={255} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
                  <label className={labelClass}>Current class session <span className="text-red-600">*</span>
                    <select
                      required
                      value={sessionId}
                      disabled={studentLookup.state !== 'found' || loadingSessions || sessions.length === 0}
                      onChange={(event) => {
                        const selected = sessions.find((item) => item.id === event.target.value) ?? null;
                        setSessionId(selected?.id ?? '');
                        setSession(selected);
                      }}
                      className={inputClass}
                    >
                      <option value="">
                        {studentLookup.state !== 'found'
                          ? 'Verify your student number first'
                          : loadingSessions
                            ? 'Loading sessions happening now…'
                            : sessions.length
                              ? 'Choose your current class session'
                              : 'No enrolled class session is in progress'}
                      </option>
                      {sessions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.course_name} · {item.cohort_name} · {item.start_time}–{item.end_time}
                        </option>
                      ))}
                    </select>
                    {studentLookup.state === 'found' && !loadingSessions && sessions.length === 0 && (
                      <span className="mt-1 block text-xs font-medium text-amber-800">There are no currently running sessions linked to your active course enrollment.</span>
                    )}
                  </label>
                </div>
          </section>

          <section data-wizard-step={1} hidden={step !== 1} className="space-y-5 p-5 sm:p-8">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Reason and audio acknowledgement</h2>
                  <p className="mt-1 text-sm text-slate-500">Tell us why you are late and acknowledge the session-audio policy.</p>
                </div>
                <label className={labelClass}>Reason for lateness <span className="text-red-600">*</span><textarea required maxLength={2000} rows={6} value={reasons} onChange={(event) => setReasons(event.target.value)} className={`${inputClass} resize-y`} /><span className="mt-1 block text-right text-xs font-medium text-slate-500">{reasons.length}/2000</span></label>
                <fieldset className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <legend className="px-1 text-sm font-bold text-slate-800">Audio (5 minutes or more late need to buy) <span className="text-red-600">*</span></legend>
                  <p className="mb-3 text-xs leading-5 text-slate-600">The answer records your acknowledgement. The system calculates lateness and determines any purchase requirement.</p>
                  <div className="flex flex-wrap gap-3">
                    {(['yes', 'no'] as const).map((option) => (
                      <label key={option} className={`flex min-w-28 cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${audioAcknowledgement === option ? 'border-red-700 bg-red-50 text-red-900' : 'border-slate-300 bg-white text-slate-700 hover:border-red-300'}`}>
                        <input required type="radio" name="audioAcknowledgement" value={option} checked={audioAcknowledgement === option} onChange={(event) => setAudioAcknowledgement(event.target.value)} className="h-4 w-4 accent-red-700" />
                        {option.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </fieldset>
          </section>

          <section data-wizard-step={2} hidden={step !== 2} className="space-y-5 p-5 sm:p-8">
                <div>
                  <h2 className="text-xl font-black text-slate-950">Administration authorization</h2>
                  <p className="mt-1 text-sm text-slate-500">Add the staff name if already authorized, then review before submitting.</p>
                </div>
                <label className={labelClass}>Administration authorization<input maxLength={255} value={administrationAuthorization} onChange={(event) => setAdministrationAuthorization(event.target.value)} className={inputClass} /><span className="mt-1 block text-xs font-medium text-slate-500">Name</span></label>
                {session && (
                  <dl className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Student</dt><dd className="mt-1 font-bold text-slate-900">{firstName} {lastName} · {studentId}</dd></div>
                    <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Class</dt><dd className="mt-1 font-bold text-slate-900">{session.course_name} · {session.cohort_name}</dd></div>
                    <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Session</dt><dd className="mt-1 font-bold text-slate-900">{session.session_date} · {session.start_time}–{session.end_time}</dd></div>
                    <div><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Contact email</dt><dd className="mt-1 break-all font-bold text-slate-900">{email}</dd></div>
                  </dl>
                )}
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-950">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <p>If you are five minutes or more late, the required session audio must be purchased. The system will notify your student account and calculate this from server time.</p>
                </div>
          </section>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-8">
                <button type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">
                  <ArrowLeft className="h-4 w-4" />Previous
                </button>
                {step < steps.length - 1 ? (
                  <button type="button" onClick={goNext} disabled={saving || !session} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60">
                    Next<ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" disabled={saving || !session} className="inline-flex items-center gap-2 rounded-xl bg-red-800 px-5 py-3 text-sm font-black text-white transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-60">
                    {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : <>Submit slip<CheckCircle2 className="h-4 w-4" /></>}
                  </button>
                )}
          </div>
        </form>

        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-600 shadow-sm">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" />
          <p>Only currently running sessions from your active course enrollments are selectable. The school server checks the selected session and calculates your lateness.</p>
        </div>
      </div>
      {feedback && (
        <SlipFeedbackAlert
          {...feedback}
          onClose={() => setFeedback(null)}
          confirmText={feedback.type === 'success' || feedback.type === 'warning' ? 'Done' : 'Go back'}
        />
      )}
    </main>
  );
}
