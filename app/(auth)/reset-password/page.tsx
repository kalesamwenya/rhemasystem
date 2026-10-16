'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Lock } from 'lucide-react';
import { api } from '@/lib/api';

type AccountType = 'student' | 'admin' | 'lecturer';

export default function ResetPasswordPage() {
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type');
    const timer = window.setTimeout(() => {
      if (type === 'student' || type === 'admin' || type === 'lecturer') setAccountType(type);
      setToken(params.get('token') || '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loginPath = accountType === 'admin' ? '/admin/login' : accountType === 'lecturer' ? '/lecturer/login' : '/login';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 12) {
      setError('Choose a password with at least 12 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.resetPassword({ account_type: accountType, token, password }) as { message?: string };
      setMessage(response.message || 'Password updated. Sign in with your new password.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset the password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        <div>
          <Link href={loginPath} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Set a new password</h1>
          <p className="mt-2 text-sm text-slate-500">Choose a password with at least 12 characters.</p>
        </div>

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {message && <div role="status" className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="h-5 w-5 shrink-0" />{message} <Link href={loginPath} className="font-bold underline">Sign in</Link></div>}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!token && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">This reset link is missing its token. Request a new one.</p>}
            <div>
              <label htmlFor="new-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">New password</label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-5 w-5 text-slate-400" />
                <input id="new-password" type="password" autoComplete="new-password" minLength={12} maxLength={4096} required value={password} onChange={(event) => setPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/10" />
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={12} maxLength={4096} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-900/10" />
            </div>
            <button type="submit" disabled={isLoading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-70">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : 'Update password'}
            </button>
          </form>
        )}

        <p className="border-t border-slate-100 pt-5 text-center text-sm text-slate-500"><Link href={`/forgot-password?type=${accountType}`} className="font-semibold text-blue-900 hover:underline">Request another reset link</Link></p>
      </section>
    </main>
  );
}
