"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";

export default function PartnerSetupForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const setup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/partner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "setup", token, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to activate your partner account.");
      window.location.assign("/partner");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to activate your partner account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9">
        <Link href="/partnerships" className="text-xs font-bold text-blue-800 hover:underline">← Back to partnerships</Link>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] text-amber-700">Partner account setup</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Choose a password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create a password of at least 12 characters to activate your secure partner workspace. This invitation can only be used once.</p>
        {token ? (
          <form onSubmit={setup} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-700">New password
              <input required type="password" minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
            </label>
            <label className="block text-sm font-bold text-slate-700">Confirm password
              <input required type="password" minLength={12} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
            </label>
            {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
              <KeyRound className="h-4 w-4" /> {loading ? "Setting up…" : "Activate partner account"}
            </button>
          </form>
        ) : <p role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">This setup link is incomplete. Contact Rhema for a new invitation.</p>}
      </section>
    </main>
  );
}
