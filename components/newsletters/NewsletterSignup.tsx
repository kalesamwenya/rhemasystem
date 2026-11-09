"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, Mail } from "lucide-react";
import { api } from "@/lib/api";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await api.newsletters.subscribe({ email, name });
      setMessage(response.message || "Please check your inbox to confirm your subscription.");
      setEmail("");
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your subscription.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-[#10283a] px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">News from Rhema</p>
          <h2 className="mt-3 max-w-xl text-3xl font-black leading-tight sm:text-4xl">Follow our journey.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200">Receive occasional stories, updates, and opportunities from the Rhema Zambia community. We’ll only email you after you confirm your subscription.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-white/15 bg-white p-5 text-slate-900 shadow-xl sm:p-6">
          {message ? (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> <span>{message}</span>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm font-bold text-slate-700">Subscribe to our newsletter</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Your name <span className="font-normal">(optional)</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" />
                </label>
                <label className="text-xs font-bold text-slate-600">Email address
                  <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} autoComplete="email" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" />
                </label>
              </div>
              {error ? <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{error}</p> : null}
              <button type="submit" disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rhema-red px-4 py-3 text-sm font-black text-white transition hover:bg-rhema-red-dark disabled:opacity-60">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {busy ? "Submitting…" : "Subscribe"}
              </button>
              <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">You can unsubscribe at any time. A confirmation email is required to activate your subscription.</p>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
