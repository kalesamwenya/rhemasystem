// src/app/(auth)/login/page.tsx
'use client';

import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

type LoginResponse = {
  access_token?: string;
  token_type?: 'Bearer';
  expires_in?: number;
  user: { id: string; name: string; role: 'student'; student_id?: string; email?: string; class?: string };
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic validation safety check
    if (!email || !password) {
      setError('Please provide both your academic email and security password.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.login({ email, password }) as LoginResponse;
      if (!response.user?.id
        || response.user.role !== 'student'
        || !/^[a-f0-9]{64}$/i.test(response.access_token || '')
        || response.token_type !== 'Bearer'
        || !Number.isFinite(response.expires_in)
        || (response.expires_in || 0) <= 0) {
        throw new Error('The sign-in service returned an invalid session. Please try again or contact the school office.');
      }
      window.sessionStorage.setItem('rhema_access_token', response.access_token!);
      window.sessionStorage.setItem('rhema_access_token_expires_at', String(Date.now() + response.expires_in! * 1000));
      window.localStorage.setItem('rhema_user', JSON.stringify(response.user));
      const requestedPath = new URLSearchParams(window.location.search).get('next');
      let returnPath = '/student';
      if (requestedPath) {
        const requestedUrl = new URL(requestedPath, window.location.origin);
        if (requestedUrl.origin === window.location.origin && requestedUrl.pathname.startsWith('/student/')) {
          returnPath = `${requestedUrl.pathname}${requestedUrl.search}${requestedUrl.hash}`;
        }
      }
      window.location.assign(returnPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Check your details or contact your systems admin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100">
        
        {/* Editorial Brand Header */}
        <div className="flex flex-col items-center text-center">
          {/* Identity Icon utilizing Navy frame + Rich Yellow interior details */}
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-900 text-yellow-500 shadow-md">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Access your unified academic portal interface
          </p>
        </div>

        {/* Dynamic System Errors - Explicit Accent Red Usage */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 border border-red-200 text-sm text-red-700">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {/* Interaction Form Block */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-medium text-blue-900 hover:underline">
                  Forgot credentials?
                </a>
              </div>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3 pl-10 pr-4 text-sm placeholder-slate-400 transition-all focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/10"
                  placeholder="••••••••••••"
                />
              </div>
            </div>
          </div>

          {/* Form Action Controls */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center items-center gap-2 rounded-xl bg-blue-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-900 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying Identity...
                </>
              ) : (
                <>
                  Sign In to Portal
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* System Notice Footer */}
        <div className="mt-6 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          Authorized personnel access only. Actions within this workspace are logged.
        </div>
      </div>
    </div>
  );
}