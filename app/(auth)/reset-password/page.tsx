'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { api } from '@/lib/api';

export default function ResetPasswordPage() {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const timer = window.setTimeout(() => setToken(params.get('token') || ''), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loginPath = '/login';

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
      const response = await api.resetPassword({ token, password }) as { message?: string };
      setMessage(response.message || 'Password updated. Sign in with your new password.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset the password.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-12">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div>
          <Link href={loginPath} className="inline-flex items-center gap-2 text-sm font-semibold text-rhema-blue hover:text-rhema-red"><ArrowLeft className="h-4 w-4" />Back to sign in</Link>
          <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">Set a new password</h1>
          <div aria-hidden="true" className="mt-3 h-1 w-12 rounded-full bg-rhema-red" />
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
                <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={4096} required value={password} onChange={(event) => setPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-sm focus:border-rhema-blue focus:outline-none focus:ring-2 focus:ring-rhema-blue/10" />
                <button type="button" onClick={() => setShowPassword((shown) => !shown)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex items-center px-3 text-rhema-blue transition hover:text-rhema-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rhema-blue">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Confirm new password</label>
              <div className="relative mt-1">
                <input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={4096} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm focus:border-rhema-blue focus:outline-none focus:ring-2 focus:ring-rhema-blue/10" />
                <button type="button" onClick={() => setShowConfirmPassword((shown) => !shown)} aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'} aria-pressed={showConfirmPassword} className="absolute inset-y-0 right-0 flex items-center px-3 text-rhema-blue transition hover:text-rhema-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rhema-blue">
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading || !token} className="flex w-full items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-3 text-sm font-semibold text-white transition hover:bg-rhema-red-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rhema-red disabled:opacity-70">
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating password...</> : 'Update password'}
            </button>
          </form>
        )}

        <p className="border-t border-slate-100 pt-5 text-center text-sm text-slate-500"><Link href="/forgot-password" className="font-semibold text-rhema-blue hover:text-rhema-red hover:underline">Request another reset link</Link></p>
      </section>
    </main>
  );
}
