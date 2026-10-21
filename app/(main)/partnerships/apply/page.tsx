'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, LoaderCircle, Send } from 'lucide-react';
import { api } from '@/lib/api';

type FormState = {
  org_name: string;
  rep_name: string;
  email: string;
  phone: string;
  partner_type: string;
  area: string;
  details: string;
  website: string;
};

const initialForm: FormState = {
  org_name: '',
  rep_name: '',
  email: '',
  phone: '',
  partner_type: '',
  area: '',
  details: '',
  website: '',
};

export default function PartnershipApplicationPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.partnerships.submitApplication(form);
      setSubmitted(true);
      setForm(initialForm);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit your partnership application.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="bg-slate-950 px-4 pb-12 pt-32 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Rhema Zambia · Partnerships</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Start a partnership conversation.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Tell us about your organization and how you would like to work with Rhema Zambia. Our team will review your application and follow up using the details you provide.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/partnerships" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back to partnerships
        </Link>

        <section className="mt-5 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Partner onboarding</p>
            <h2 className="mt-3 text-xl font-black text-[#10283a]">What happens next?</h2>
            <ol className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <li><span className="font-bold text-slate-900">1. Submit your details.</span> Share your organization, contact person and proposed area of collaboration.</li>
              <li><span className="font-bold text-slate-900">2. Admissions reviews it.</span> An authorized team member will review the application.</li>
              <li><span className="font-bold text-slate-900">3. We follow up.</span> Our team will contact you to discuss suitable next steps.</li>
            </ol>
          </aside>

          <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {submitted ? (
              <div role="status" className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <p><strong>Application submitted.</strong> Thank you. The Rhema Zambia team will review your partnership proposal.</p>
              </div>
            ) : null}
            <h2 className="text-2xl font-black text-[#10283a]">Partnership application</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Fields marked with * are required.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-700">Organization name *
                <input required maxLength={255} autoComplete="organization" value={form.org_name} onChange={(event) => update('org_name', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <label className="text-xs font-bold text-slate-700">Contact person *
                <input required maxLength={160} autoComplete="name" value={form.rep_name} onChange={(event) => update('rep_name', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <label className="text-xs font-bold text-slate-700">Email address *
                <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => update('email', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <label className="text-xs font-bold text-slate-700">Phone number
                <input type="tel" maxLength={80} autoComplete="tel" value={form.phone} onChange={(event) => update('phone', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <label className="text-xs font-bold text-slate-700">Organization type *
                <select required value={form.partner_type} onChange={(event) => update('partner_type', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500">
                  <option value="">Select organization type</option>
                  <option>Educational institution</option>
                  <option>Government or statutory body</option>
                  <option>Church or ministry</option>
                  <option>Non-profit or community organization</option>
                  <option>Business or corporate sponsor</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-700">Area of collaboration *
                <input required maxLength={160} value={form.area} onChange={(event) => update('area', event.target.value)} placeholder="Education, training, community support..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
            </div>

            <label className="mt-4 block text-xs font-bold text-slate-700">Tell us about your proposal *
              <textarea required maxLength={5000} rows={6} value={form.details} onChange={(event) => update('details', event.target.value)} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal leading-6 outline-none focus:border-blue-500" />
            </label>
            <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} />
            </label>

            {error ? <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
            <button type="submit" disabled={submitting} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? 'Submitting…' : 'Submit partnership application'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
