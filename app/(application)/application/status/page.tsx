'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock3, LoaderCircle, RotateCw } from 'lucide-react';
import { api } from '@/lib/api';

type RecommendationStatus = {
  status: 'pending' | 'sent' | 'failed' | 'submitted';
  submitted_at: string | null;
};

type ApplicationStatus = {
  id: string;
  program: string;
  status: string;
  payment_status: string;
  submitted_at: string;
  recommendations: Partial<Record<'pastoral' | 'personal', RecommendationStatus>>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not yet submitted';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ApplicationStatusPage() {
  const [token, setToken] = useState('');
  const [application, setApplication] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (trackingToken: string) => {
    setError('');
    try {
      const response = await api.admissions.getStatus(trackingToken) as { data?: ApplicationStatus };
      if (!response.data?.id) throw new Error('The status service returned an invalid application record.');
      setApplication(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to retrieve application status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const linkToken = window.location.hash.slice(1);
      if (!/^[a-f0-9]{64}$/.test(linkToken)) {
        setError('This tracking link is missing or invalid. Open the private link sent to your email, or contact admissions for help.');
        setLoading(false);
        return;
      }
      setToken(linkToken);
      void refresh(linkToken);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = window.setInterval(() => { void refresh(token); }, 30000);
    return () => window.clearInterval(interval);
  }, [refresh, token]);

  const recommendationLabel = (status: RecommendationStatus | undefined) => {
    if (!status) return 'Invitation pending';
    if (status.status === 'submitted') return `Submitted · ${formatDate(status.submitted_at)}`;
    if (status.status === 'failed') return 'Email delivery failed — contact admissions';
    if (status.status === 'sent') return 'Invitation emailed · awaiting referee';
    return 'Invitation pending';
  };

  return (
    <section className="min-h-[70vh] bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/apply" className="text-sm font-semibold text-blue-800 hover:underline">Admissions</Link>
        <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <header className="bg-[#10283a] px-6 py-7 text-white sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Private application tracking</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">Application progress</h1>
            <p className="mt-2 text-sm text-slate-200">This page shows application and recommendation progress. Keep your private tracking link secure.</p>
          </header>

          <div className="space-y-6 p-6 sm:p-8">
            {loading ? (
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600" role="status">
                <LoaderCircle className="h-5 w-5 animate-spin" /> Loading application status…
              </div>
            ) : null}

            {error ? (
              <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <div><p className="font-bold">Status unavailable</p><p className="mt-1">{error}</p></div>
              </div>
            ) : null}

            {application ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Application reference</p>
                    <p className="mt-1 font-bold text-slate-900">{application.id}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Program</p>
                    <p className="mt-1 font-bold text-slate-900">{application.program || 'Not specified'}</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-4 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Admissions status</p>
                    <p className="mt-1 text-lg font-black text-blue-950">{application.status}</p>
                    <p className="mt-1 text-xs text-blue-800">Submitted {formatDate(application.submitted_at)}</p>
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-black text-slate-900">Recommendation progress</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(['pastoral', 'personal'] as const).map((kind) => {
                      const recommendation = application.recommendations?.[kind];
                      const submitted = recommendation?.status === 'submitted';
                      return (
                        <div key={kind} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center gap-2">
                            {submitted
                              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              : <Clock3 className="h-5 w-5 text-amber-600" />}
                            <p className="font-bold capitalize text-slate-900">{kind} recommendation</p>
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{recommendationLabel(recommendation)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <p className="text-xs text-slate-500">Status refreshes automatically every 30 seconds.</p>
                  <button
                    type="button"
                    onClick={() => { if (token) { setLoading(true); void refresh(token); } }}
                    disabled={loading || !token}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RotateCw className="h-4 w-4" /> Refresh now
                  </button>
                </div>
                <p className="text-xs leading-5 text-slate-500">Your private link is the key to this status page. Do not forward or post it. If it expires, contact admissions using your application reference.</p>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
