'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyStudentEmailPage() {
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setToken(params.get('token') || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError('This verification link is missing or invalid. Ask the school to send a new verification email.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the verification email.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.students.verifyStudentEmailChange(token, code) as { message?: string };
      setMessage(response.message || 'Your new email address has been verified and activated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify this email address.');
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
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Verify your email address</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter the 6-digit verification code from this email. Your new address will be activated only after you confirm it.</p>
        </div>

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!token && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Open the verification link in the email sent to your new address.</p>}
            <label htmlFor="email-verification-code" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Email verification code
              <input
                id="email-verification-code"
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
            <button type="submit" disabled={loading || !token || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-rhema-red-dark disabled:opacity-60">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Verifying email...</> : 'Verify and activate email'}
            </button>
          </form>
        )}

        <p className="border-t border-slate-100 pt-5 text-center text-xs leading-relaxed text-slate-500">The secure link and code expire after 10 minutes and can be used once. If they expire, contact the school to request a new email verification.</p>
      </section>
    </main>
  );
}
