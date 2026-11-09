"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Save } from "lucide-react";

type PartnerProfile = { name: string; contact: string; email: string; phone: string; newsletter_opt_in: boolean };

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState<PartnerProfile>({ name: "", contact: "", email: "", phone: "", newsletter_opt_in: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/portal", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load the partner profile.");
      setProfile({ name: data.partner.name || "", contact: data.partner.contact || "", email: data.partner.email || "", phone: data.partner.phone || "", newsletter_opt_in: Boolean(data.partner.newsletter_opt_in) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the partner profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/partner/portal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ org_name: profile.name, rep_name: profile.contact, phone: profile.phone, newsletter_opt_in: profile.newsletter_opt_in }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to save the partner profile.");
      setMessage(data.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the partner profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Account settings</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Partner profile</h1>
        <p className="mt-2 text-sm text-slate-500">Keep your organization and primary contact details current.</p>
      </header>
      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-bold text-slate-700">Organization name
          <input required maxLength={255} disabled={loading} value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Primary contact
          <input required maxLength={160} disabled={loading} value={profile.contact} onChange={(event) => setProfile((current) => ({ ...current, contact: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
        </label>
        <label className="block text-sm font-bold text-slate-700">Sign-in email
          <input disabled value={profile.email} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-500" />
          <span className="mt-1 block text-xs font-normal text-slate-500">Contact Rhema to update the email address used for sign-in.</span>
        </label>
        <label className="block text-sm font-bold text-slate-700">Phone number
          <input type="tel" maxLength={80} disabled={loading} value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-normal outline-none focus:border-blue-500" />
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <input type="checkbox" checked={profile.newsletter_opt_in} disabled={loading} onChange={(event) => setProfile((current) => ({ ...current, newsletter_opt_in: event.target.checked }))} className="mt-1 h-4 w-4 accent-blue-800" />
          <span><span className="font-bold text-slate-800">Receive Rhema Zambia’s journey newsletter</span><span className="mt-1 block text-xs font-normal leading-5 text-slate-500">Share updates and stories with me by email. I can change this preference at any time.</span></span>
        </label>
        <button type="submit" disabled={saving || loading} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
