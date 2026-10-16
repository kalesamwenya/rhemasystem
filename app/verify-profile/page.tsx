'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type VerifiedProfile = {
  verified: true;
  name: string;
  student_id: string;
  cohort: string;
  expires_at: string;
};

type VerificationResponse = { data: VerifiedProfile };

export default function VerifyProfilePage() {
  const [profile, setProfile] = useState<VerifiedProfile | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get('token') || '';
    if (!/^[a-f0-9]{64}$/i.test(token)) {
      queueMicrotask(() => {
        if (!active) return;
        setError('This student profile verification link is invalid.');
        setLoading(false);
      });
      return () => { active = false; };
    }

    api.students.verifyStudentProfile(token)
      .then((response) => {
        if (active) setProfile((response as VerificationResponse).data);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to verify this student profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-950 px-7 py-7 text-white sm:px-10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">Rhema Bible School</p>
          <h1 className="mt-2 text-2xl font-black">Student profile verification</h1>
          <p className="mt-2 text-xs text-slate-300">Independent confirmation from the school student register.</p>
        </header>
        {loading ? (
          <div className="flex min-h-52 items-center justify-center gap-3 text-sm font-semibold text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Checking the student record...</div>
        ) : profile ? (
          <div className="p-7 sm:p-10">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div><p className="text-sm font-black uppercase tracking-wide">Profile verified</p><p className="mt-1 text-xs">This is an active student record held by Rhema Bible School.</p></div>
            </div>
            <dl className="mt-7 divide-y divide-slate-100 text-sm">
              <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Student</dt><dd className="text-right font-bold text-slate-900">{profile.name}</dd></div>
              <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Student ID</dt><dd className="font-mono font-bold text-slate-900">{profile.student_id}</dd></div>
              <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Cohort</dt><dd className="font-bold text-slate-900">{profile.cohort || 'Not assigned'}</dd></div>
              <div className="flex justify-between gap-5 py-3"><dt className="text-slate-500">Verification valid until</dt><dd className="text-right font-semibold text-slate-900">{new Date(profile.expires_at).toLocaleDateString()}</dd></div>
            </dl>
            <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-4 text-[11px] leading-5 text-slate-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-900" />
              <p>This verification confirms the student identity details above. It does not expose private contact, guardian, or academic records.</p>
            </div>
          </div>
        ) : (
          <div role="alert" className="flex min-h-52 items-center gap-3 p-7 text-sm text-red-800 sm:p-10">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error || 'This student profile could not be verified.'}</p>
          </div>
        )}
        <footer className="border-t border-slate-100 px-7 py-4 text-center text-[10px] text-slate-400 sm:px-10">Rhema Bible School · Official student register verification</footer>
      </section>
    </main>
  );
}
