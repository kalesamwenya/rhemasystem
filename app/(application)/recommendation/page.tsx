'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, LoaderCircle, Send } from 'lucide-react';
import { api } from '@/lib/api';

type InviteInfo = {
  studentName: string;
  program: string;
  type: 'pastoral' | 'personal';
  recommenderName: string;
  status: string;
  submittedAt: string | null;
};

type RecommendationForm = {
  knownFor: string;
  character: string;
  strengths: string;
  concerns: string;
  recommendation: string;
  comments: string;
};

const emptyForm: RecommendationForm = {
  knownFor: '',
  character: '',
  strengths: '',
  concerns: '',
  recommendation: '',
  comments: '',
};

export default function RecommendationPage() {
  const [token, setToken] = useState('');
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const inviteToken = new URLSearchParams(window.location.search).get('token') || '';
      if (!inviteToken) {
        setError('This recommendation link is incomplete. Please ask the applicant to send you a new invitation.');
        setLoading(false);
        return;
      }
      setToken(inviteToken);
      void api.admissions.get(inviteToken)
        .then((response: { data?: InviteInfo; message?: string }) => {
          if (!response.data) throw new Error(response.message || 'This recommendation link is invalid or expired.');
          if (!active) return;
          setInvite(response.data);
          setSubmitted(response.data.status === 'submitted');
        })
        .catch((cause: unknown) => {
          if (active) setError(cause instanceof Error ? cause.message : 'Unable to load this recommendation invitation.');
        })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  const update = (key: keyof RecommendationForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token || !form.comments.trim() || !form.character.trim() || !form.recommendation) {
      setError('Please complete the required character assessment, recommendation, and comments.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.admissions.saveRecommendation({
        token,
        answers: form,
        comments: form.comments,
      });
      setSubmitted(true);
      setInvite((current) => current ? { ...current, status: 'submitted' } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit this recommendation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-900 px-6 py-7 text-white sm:px-9">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Rhema Admissions</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Confidential recommendation</h1>
          <p className="mt-2 text-sm text-slate-300">Your response will be attached securely to the applicant&apos;s admission file.</p>
        </header>
        <div className="p-6 sm:p-9">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm font-semibold text-slate-600"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading invitation…</div>
          ) : error && !invite ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800">{error}</p>
          ) : invite ? (
            <>
              <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
                <p><strong>Applicant:</strong> {invite.studentName}</p>
                {invite.program ? <p className="mt-1"><strong>Programme:</strong> {invite.program}</p> : null}
                <p className="mt-1"><strong>Reference:</strong> {invite.type === 'pastoral' ? 'Pastoral' : 'Personal'}</p>
                <p className="mt-1"><strong>Invited referee:</strong> {invite.recommenderName}</p>
              </div>
              {submitted ? (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                  <div><p className="font-bold">Recommendation received</p><p className="mt-1 text-sm">Thank you. Your submission has been linked to the applicant&apos;s file.</p></div>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <label className="block text-sm font-semibold text-slate-800">How long have you known the applicant?
                    <input value={form.knownFor} onChange={(event) => update('knownFor', event.target.value)} maxLength={255} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">Character and conduct <span className="text-red-600">*</span>
                    <textarea required value={form.character} onChange={(event) => update('character', event.target.value)} maxLength={5000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">Strengths
                    <textarea value={form.strengths} onChange={(event) => update('strengths', event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">Areas for growth
                    <textarea value={form.concerns} onChange={(event) => update('concerns', event.target.value)} maxLength={5000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">Would you recommend this applicant? <span className="text-red-600">*</span>
                    <select required value={form.recommendation} onChange={(event) => update('recommendation', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-normal">
                      <option value="">Select a response</option>
                      <option value="Strongly recommend">Strongly recommend</option>
                      <option value="Recommend">Recommend</option>
                      <option value="Recommend with reservations">Recommend with reservations</option>
                      <option value="Do not recommend">Do not recommend</option>
                    </select>
                  </label>
                  <label className="block text-sm font-semibold text-slate-800">Additional comments <span className="text-red-600">*</span>
                    <textarea required value={form.comments} onChange={(event) => update('comments', event.target.value)} maxLength={10000} rows={5} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 font-normal" />
                  </label>
                  {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}
                  <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-60">
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {saving ? 'Submitting…' : 'Submit recommendation'}
                  </button>
                </form>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
