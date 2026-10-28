'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertCircle, ArrowRight, GraduationCap, Loader2, Lock, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { getAdminLandingPath } from '@/lib/admin-access';
import { setAuthSession } from '@/lib/auth';

type AccountType = 'student' | 'lecturer' | 'admin';
type LoginResponse = {
  access_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  user?: {
    id: string;
    name: string;
    email?: string;
    role: AccountType;
    student_id?: string;
    class?: string;
    person_id?: string;
    department?: string;
    title?: string;
    admin_role?: string;
  };
};

function getSafeReturnPath(accountType: AccountType, requestedPath: string | null): string {
  const defaultPath = accountType === 'student'
    ? '/student'
    : accountType === 'lecturer'
      ? '/lecturer'
      : '/admin';
  if (!requestedPath || !requestedPath.startsWith('/') || requestedPath.startsWith('//')) return defaultPath;

  try {
    const url = new URL(requestedPath, window.location.origin);
    if (url.origin !== window.location.origin) return defaultPath;
    const prefix = `/${accountType}`;
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return defaultPath;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return defaultPath;
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.portalLogin({ email: email.trim(), password }) as LoginResponse;
      const user = response.user;
      if (!user?.id
        || !user.name
        || !['student', 'lecturer', 'admin'].includes(user.role)
        || !/^[a-f0-9]{64}$/i.test(response.access_token || '')
        || response.token_type !== 'Bearer'
        || !Number.isFinite(response.expires_in)
        || (response.expires_in || 0) <= 0
        || (user.role === 'admin' && !user.admin_role)
        || (user.role === 'lecturer' && !user.person_id)) {
        throw new Error('The sign-in service returned an invalid session. Please try again or contact the school office.');
      }

      window.localStorage.setItem('rhema_user', JSON.stringify(user));
      setAuthSession(response.access_token!, response.expires_in!);
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      const destination = user.role === 'admin' && !requestedPath
        ? getAdminLandingPath(user.admin_role || '')
        : getSafeReturnPath(user.role, requestedPath);
      window.location.assign(destination);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <section
        aria-label="Welcome to Rhema Bible Training Center"
        className="relative isolate flex min-h-[340px] items-end overflow-hidden bg-blue-950 px-7 py-10 sm:px-10 lg:min-h-screen lg:px-16 lg:py-16"
      >
        <Image
          src="/login-study.jpg"
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 54vw, 100vw"
          className="object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-blue-950/85 via-blue-950/55 to-slate-950/85" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(234,179,8,0.22),transparent_48%)]" />
        <div className="relative max-w-xl text-white">
          <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-amber-300 backdrop-blur-sm">
            <GraduationCap className="h-6 w-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Rhema Bible Training Center</p>
          <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            Grow in faith.
            <br />
            Prepare for purpose.
          </h2>
          <p className="mt-5 max-w-lg text-sm leading-7 text-blue-50/90 sm:text-base">
            Learn, serve, and grow in a community devoted to the Word and to preparing leaders for a life of purpose.
          </p>
          <div aria-hidden="true" className="mt-8 h-1 w-16 rounded-full bg-amber-300" />
        </div>
      </section>

      <section className="relative flex min-h-[62vh] items-center justify-center px-5 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(234,179,8,0.1),transparent_38%),radial-gradient(ellipse_at_bottom_left,rgba(37,99,235,0.08),transparent_42%)]" />
        <div className="relative w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-900/5 sm:p-10">
          <header className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-950 text-amber-400 shadow-lg shadow-blue-950/15">
              <GraduationCap className="h-7 w-7" />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-blue-900">Rhema Bible Training Center</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in with your school account.</p>
          </header>

          {error && (
            <div role="alert" className="mt-7 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p>{error}</p>
            </div>
          )}

          <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Email address</label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute inset-y-0 my-auto ml-3 h-5 w-5 text-slate-400" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-900/10"
                  placeholder="name@school.org"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">Password</label>
                <Link href="/forgot-password" className="text-xs font-semibold text-blue-900 hover:underline">Forgot password?</Link>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute inset-y-0 my-auto ml-3 h-5 w-5 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-900 focus:bg-white focus:ring-2 focus:ring-blue-900/10"
                  placeholder="Enter your password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-950 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition hover:bg-blue-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking your account...</> : <>Sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <p className="text-[11px] leading-5 text-slate-400">Use the email address registered with the school. Need help? Contact the school office.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
