// src/app/(auth)/forgot-password/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

type AccountType = 'student' | 'admin' | 'lecturer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const type = new URLSearchParams(window.location.search).get('type');
    if (type !== 'student' && type !== 'admin' && type !== 'lecturer') return;
    const timer = window.setTimeout(() => setAccountType(type), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.forgotPassword({ account_type: accountType, email }) as { message?: string };
      setMessage(response.message || 'If an active account matches those details, a reset link will be emailed.');
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request a reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  const loginPath = accountType === 'admin' ? '/admin/login' : accountType === 'lecturer' ? '/lecturer/login' : '/login';

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        
        {!isSubmitted ? (
          <>
            {/* Form State View Header */}
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-yellow-500 shadow-md">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
                Reset your password
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-xs">
                Select your portal and enter its registered email address.
              </p>
            </div>

            {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

            {/* Input Action Form */}
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="account-type" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Account type</label>
                <select id="account-type" value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <option value="student">Student</option>
                  <option value="admin">Administrator</option>
                  <option value="lecturer">Lecturer</option>
                </select>
              </div>
              <div>
                <label htmlFor="email-address" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Academic Email Address
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm placeholder-slate-400 transition-all focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                    placeholder="name@university.edu"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>

                <Link
                  href={loginPath}
                  className="flex w-full justify-center items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Verification Success View State */}
            <div className="flex flex-col items-center text-center py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                Link dispatched
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {message}
              </p>
              <p className="mt-2 text-sm text-slate-500">Requested for <span className="font-semibold text-slate-800">{email}</span>.</p>

              <div className="mt-8 w-full pt-6 border-t border-slate-100">
                <Link
                  href={loginPath}
                  className="flex w-full justify-center items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900"
                >
                  Return to Login Panel
                </Link>
              </div>
            </div>
          </>
        )}

        {/* System Notice Footer */}
        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          Reset links expire after 30 minutes and work once. If email delivery is not configured, contact the school administrator.
        </div>

      </div>
    </div>
  );
}