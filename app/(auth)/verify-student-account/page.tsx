'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyStudentAccountPage() {
  const [studentId, setStudentId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const response = await api.students.verifyAdmissionAccount({
        student_id: studentId.trim(),
        code,
      }) as { success?: boolean; message?: string };
      if (!response.success) throw new Error(response.message || 'Unable to verify your student account.');
      setMessage(response.message || 'Your account is verified. You can now sign in.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify your student account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-12">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-rhema-blue hover:text-rhema-red">
            <ArrowLeft className="h-4 w-4" />Back to sign in
          </Link>
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-rhema-blue text-white">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Verify your student account</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter your student ID and the 6-digit code from your application approval email. The code expires after 30 minutes.</p>
        </div>

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</div>}

        {!message && <form onSubmit={handleSubmit} className="space-y-5">
          <label htmlFor="student-verification-id" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Student ID
            <input
              id="student-verification-id"
              name="student_id"
              autoComplete="username"
              required
              value={studentId}
              onChange={(event) => setStudentId(event.target.value.toUpperCase())}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-rhema-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-rhema-blue/10"
              placeholder="Your student ID"
            />
          </label>
          <label htmlFor="student-verification-code" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            6-digit verification code
            <input
              id="student-verification-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-slate-900 focus:border-rhema-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-rhema-blue/10"
              placeholder="000000"
            />
          </label>
          <button type="submit" disabled={loading || code.length !== 6 || studentId.trim() === ''} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-rhema-red-dark disabled:opacity-60">
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying account...</> : 'Verify and activate account'}
          </button>
        </form>}

        {message && <Link href="/login" className="block rounded-xl bg-rhema-red px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-rhema-red-dark">Continue to sign in</Link>}
      </section>
    </main>
  );
}
