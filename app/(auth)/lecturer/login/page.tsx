'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, GraduationCap, Loader2, Lock, Mail } from 'lucide-react';
import { api } from '@/lib/api';

interface LecturerLoginResponse {
  access_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  user?: {
    id: string;
    person_id: string;
    name: string;
    email: string;
    department: string;
    title: string;
    role: 'lecturer';
  };
}

export default function LecturerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.lecturerLogin({ email, password }) as LecturerLoginResponse;
      const user = response.user;
      if (!user?.id
        || !user.person_id
        || !user.name
        || !user.email
        || user.role !== 'lecturer'
        || !/^[a-f0-9]{64}$/i.test(response.access_token || '')
        || response.token_type !== 'Bearer'
        || !Number.isFinite(response.expires_in)
        || (response.expires_in || 0) <= 0) {
        throw new Error('The sign-in service returned an invalid lecturer session.');
      }

      window.sessionStorage.setItem('rhema_access_token', response.access_token!);
      window.sessionStorage.setItem('rhema_access_token_expires_at', String(Date.now() + response.expires_in! * 1000));
      window.localStorage.setItem('rhema_user', JSON.stringify(user));
      window.location.assign('/lecturer');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12">
      <section className="w-full max-w-md space-y-7 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-amber-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-900">Lecturer sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Use the email address registered in the school directory.</p>
        </div>

        {error && <div role="alert" className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="lecturer-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Lecturer email</label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-5 w-5 text-slate-400" />
              <input id="lecturer-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
          </div>
          <div>
            <label htmlFor="lecturer-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-5 w-5 text-slate-400" />
              <input id="lecturer-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-70">
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying account...</> : <>Sign in to lecturer portal <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>

        <div className="space-y-3 border-t border-slate-100 pt-5 text-center text-sm">
          <p><Link href="/forgot-password?type=lecturer" className="font-semibold text-slate-900 hover:underline">Forgot lecturer password?</Link></p>
        </div>
      </section>
    </main>
  );
}
