'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, GraduationCap, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { getAdminLandingPath } from '@/lib/admin-access';

interface AdminLoginResponse {
  access_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  user?: {
    id: string;
    name: string;
    email: string;
    role: 'admin';
    admin_role: string;
    department: string;
  };
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const response = await api.adminLogin({ email, password }) as AdminLoginResponse;
      const user = response.user;
      if (!user?.id
        || !user.name
        || !user.email
        || user.role !== 'admin'
        || !user.admin_role
        || !user.department
        || !/^[a-f0-9]{64}$/i.test(response.access_token || '')
        || response.token_type !== 'Bearer'
        || !Number.isFinite(response.expires_in)
        || (response.expires_in || 0) <= 0) {
        throw new Error('The sign-in service returned an invalid administrator profile.');
      }

      window.sessionStorage.setItem('rhema_access_token', response.access_token!);
      window.sessionStorage.setItem('rhema_access_token_expires_at', String(Date.now() + response.expires_in! * 1000));
      window.localStorage.setItem('rhema_user', JSON.stringify(user));
      window.location.assign(getAdminLandingPath(user.admin_role));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-yellow-500 shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-900">
            <ShieldCheck className="h-3.5 w-3.5" /> Secure administrator access
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Admin sign in</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in with your school administrator account.</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>{error}</div>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Administrator email
            </label>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-5 w-5 text-slate-400" />
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm transition-all focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                placeholder="admin@school.org"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute inset-y-0 left-0 my-auto ml-3 h-5 w-5 text-slate-400" />
              <input
                id="admin-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm transition-all focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 disabled:opacity-70"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Verifying account...</> : <>Sign in to admin panel <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
          </button>
        </form>

        <p className="border-t border-slate-100 pt-5 text-center text-sm text-slate-500">
          <Link href="/forgot-password?type=admin" className="font-semibold text-blue-900 hover:underline">Forgot your admin password?</Link>
        </p>
      </section>
    </main>
  );
}
