'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, LoaderCircle, MailCheck } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyAdminEmailPage() {
  const [token, setToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setToken(new URLSearchParams(window.location.search).get('token') || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const verifyEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      setError('This verification link is missing or invalid. Request a new email change from your account settings.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from the verification email.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.verifyAdminEmailChange(token, code) as { message?: string };
      setMessage(response.message || 'Your new email address has been verified. Sign in with it to continue.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to verify this email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div>
          <Link href="/admin/login" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003da5] hover:text-[#c8102e]">
            <ArrowLeft className="h-4 w-4" /> Back to staff sign in
          </Link>
          <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#003da5] text-white">
            <MailCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">Verify your new email</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter the 6-digit code sent to your new address. Your sign-in email changes only after verification.</p>
        </div>

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {message && (
          <div role="status" className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="flex gap-3"><CheckCircle2 className="h-5 w-5 shrink-0" />{message}</p>
            <Link href="/admin/login" className="inline-flex font-bold text-[#003da5] underline">Go to staff sign in</Link>
          </div>
        )}

        {!message && (
          <form onSubmit={(event) => void verifyEmail(event)} className="space-y-5">
            {!token && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Open the verification link in the email sent to your new address.</p>}
            <label htmlFor="admin-email-verification-code" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Email verification code
              <input
                id="admin-email-verification-code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg tracking-[0.5em] text-slate-900 focus:border-[#003da5] focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                placeholder="000000"
              />
            </label>
            <button type="submit" disabled={loading || !token || code.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#c8102e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a90d27] disabled:opacity-60">
              {loading ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Verifying email…</> : 'Verify and update sign-in email'}
            </button>
          </form>
        )}

        <p className="border-t border-slate-100 pt-5 text-center text-xs leading-relaxed text-slate-500">The secure link and code expire after 10 minutes and can be used once. After a successful change, sign in again with your new email.</p>
      </section>
    </main>
  );
}
