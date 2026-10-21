'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

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
    late_minutes: number;
    requires_audio_purchase: boolean;
    audio_configured: boolean;
    audio_purchased: boolean;
    audio_title: string | null;
    audio_price: number | null;
    audio_currency: string | null;
  };
};

export default function LateSlipPage() {
  const [sessionId, setSessionId] = useState('');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SlipResponse['data'] | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const id = new URLSearchParams(window.location.search).get('session_id')?.trim() || '';
      setSessionId(id);
      if (!id) {
        setError('This QR code does not include a class session. Scan the QR code displayed for your class.');
        setLoadingSession(false);
        return;
      }
      api.attendance.publicSlipSession(id)
        .then((response: { data?: SessionInfo }) => {
          if (!active) return;
          if (!response.data) throw new Error('The class session could not be found.');
          setSession(response.data);
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this class session.');
        })
        .finally(() => { if (active) setLoadingSession(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const response = await api.attendance.submitStudentSlip({
        type: 'late_slip',
        session_id: sessionId,
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        acknowledged,
      }) as SlipResponse;
      if (!response.data) throw new Error('The school system did not confirm the late slip.');
      setResult(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit this late slip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-sky-300"><Clock3 className="h-6 w-6" /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Student Affairs · Class attendance</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Late slip</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Verify your student details to record your arrival for this class. Arrival time and any audio requirement are calculated by the school system.</p>
        </header>

        {session && (
          <section className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950">
            <p className="text-xs font-black uppercase tracking-wider text-sky-800">Scanned class session</p>
            <h2 className="mt-1 text-lg font-black">{session.course_name}</h2>
            <p className="mt-1 text-sm">{session.cohort_name} · {session.session_date} · {session.start_time}–{session.end_time}</p>
          </section>
        )}

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
        {result && (
          <div role="status" className={`mb-5 rounded-2xl border p-5 ${result.requires_audio_purchase || !result.audio_configured ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <div className="flex items-start gap-3">
              {result.requires_audio_purchase || !result.audio_configured ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <div className="min-w-0">
                <p className="font-black">Late slip recorded for {result.student_name}</p>
                <p className="mt-1 text-sm">{result.course_name} · {result.late_minutes} minute{result.late_minutes === 1 ? '' : 's'} late.</p>
                {result.requires_audio_purchase && (
                  <>
                    <p className="mt-2 text-sm font-bold">Purchase required session audio: {result.audio_title}{result.audio_price !== null ? ` · ${result.audio_currency || ''} ${result.audio_price.toFixed(2)}` : ''}.</p>
                    <Link href="/student/library" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-sm font-bold text-white hover:bg-amber-950">Sign in and purchase audio <ArrowRight className="h-4 w-4" /></Link>
                    <p className="mt-2 text-xs">A notification has also been sent to your student account.</p>
                  </>
                )}
                {result.audio_purchased && result.late_minutes > 5 && <p className="mt-2 text-sm font-semibold">You already have access to the required session audio; no further purchase is needed.</p>}
                {!result.audio_configured && <p className="mt-2 text-sm font-semibold">The required audio is not configured for this session. Student Affairs has been notified to resolve this.</p>}
                {result.late_minutes <= 5 && <p className="mt-2 text-sm">No audio purchase is required for arrivals within five minutes of the scheduled start.</p>}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          {loadingSession ? (
            <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading class session…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-bold text-slate-800">
                  Student number
                  <input required maxLength={50} autoComplete="off" value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-medium outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" />
                </label>
                <label className="block text-sm font-bold text-slate-800">
                  Full name
                  <input required maxLength={255} autoComplete="name" value={studentName} onChange={(event) => setStudentName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-medium outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" />
                </label>
              </div>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700">
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
                <span>I confirm I am submitting my own arrival slip. I understand that arriving more than five minutes after class starts requires purchasing the session audio.</span>
              </label>
              <button type="submit" disabled={saving || loadingSession || !session || !acknowledged} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : 'Submit late slip'}
              </button>
              <p className="text-center text-xs leading-5 text-slate-500">The session schedule and server time determine your lateness. Submissions are limited to enrolled students during the class session.</p>
            </>
          )}
        </form>
      </div>
    </main>
  );
}
