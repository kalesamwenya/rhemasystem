"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";

export default function PartnerLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/partner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to sign in.");
      window.location.assign("/partner");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link href="/partnerships" className="text-xs font-bold text-blue-800 hover:underline">← Back to partnerships</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-blue-700">Rhema partner workspace</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Sign in to review opportunities and contribution records.</p>
        <form onSubmit={signIn} className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-slate-700">Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
          </label>
          <label className="block text-sm font-bold text-slate-700">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
          </label>
          {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
          <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
            <LockKeyhole className="h-4 w-4" /> {loading ? "Signing in…" : "Sign in"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">Need to set or reset your password? Contact Rhema to request a secure setup link.</p>
      </section>
    </main>
  );
}
