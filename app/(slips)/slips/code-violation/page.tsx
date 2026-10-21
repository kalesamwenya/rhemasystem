'use client';

import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type SlipResponse = {
  data?: {
    student_name: string;
    term_id: number;
    violations_this_term: number;
    flagged: boolean;
  };
};

export default function CodeViolationSlipPage() {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [details, setDetails] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SlipResponse['data'] | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);
    try {
      const response = await api.attendance.submitStudentSlip({
        type: 'code_violation',
        student_id: studentId.trim(),
        student_name: studentName.trim(),
        details: details.trim(),
        acknowledged,
      }) as SlipResponse;
      if (!response.data) throw new Error('The school system did not confirm the slip submission.');
      setResult(response.data);
      setStudentId('');
      setStudentName('');
      setDetails('');
      setAcknowledged(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit this code-of-conduct slip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3 text-amber-300"><ShieldCheck className="h-6 w-6" /></div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Student Affairs · Code of Conduct</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Code violation slip</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Enter your student details and describe the incident. The school records each submission against the current academic term.</p>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
        {result && (
          <div role="status" className={`mb-5 rounded-2xl border p-5 ${result.flagged ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
            <div className="flex items-start gap-3">
              {result.flagged ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />}
              <div>
                <p className="font-black">Slip recorded for {result.student_name} · Term {result.term_id}</p>
                <p className="mt-1 text-sm">Recorded violations this term: {result.violations_this_term}.</p>
                {result.flagged && <p className="mt-2 text-sm font-bold">This student has exceeded three violations and is flagged for Student Affairs follow-up.</p>}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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
          <label className="block text-sm font-bold text-slate-800">
            Describe the code-of-conduct incident
            <textarea required minLength={1} maxLength={2000} rows={5} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-3 py-3 font-medium outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100" placeholder="Provide a clear, factual description." />
            <span className="mt-1 block text-right text-xs font-medium text-slate-500">{details.length}/2000</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-5 text-slate-700">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
            <span>I confirm these details are accurate and understand this submission will be included in my code-of-conduct record for the current term.</span>
          </label>
          <button type="submit" disabled={saving || !acknowledged} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Submitting…</> : 'Submit code violation slip'}
          </button>
          <p className="text-center text-xs leading-5 text-slate-500">Your student number and name are checked against school records. More than three recorded violations in a term trigger a Student Affairs flag.</p>
        </form>
      </div>
    </main>
  );
}
