"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Clock3, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/api";

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
};

export default function PartnerApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.partnerships.applications();
      setApplications(Array.isArray(response.applications) ? response.applications : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load partnership applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const decide = async (application, approval_status) => {
    setSavingId(application.id);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.reviewApplication({
        id: application.id,
        approval_status,
      });
      setMessage(response.message || `Application ${approval_status}.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this application.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Partner onboarding</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">Partnership applications</h1>
            <p className="mt-2 text-sm text-slate-300">Review proposals submitted through the public partnerships form.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading partnership applications…</div>
        ) : applications.length ? applications.map((application) => (
          <article key={application.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col justify-between gap-5 lg:flex-row">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-black text-slate-900">{application.org_name}</h2>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${application.approval_status === "approved" ? "bg-emerald-100 text-emerald-800" : application.approval_status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>
                    {application.approval_status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{application.rep_name} · <a className="text-blue-800 hover:underline" href={`mailto:${application.email}`}>{application.email}</a>{application.phone ? ` · ${application.phone}` : ""}</p>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p><strong className="text-slate-800">Organization type:</strong> <span className="text-slate-600">{application.partner_type}</span></p>
                  <p><strong className="text-slate-800">Area:</strong> <span className="text-slate-600">{application.area}</span></p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{application.details}</p>
                <p className="mt-4 text-xs text-slate-400">Submitted {formatDate(application.created_at)}{application.reviewed_at ? ` · Reviewed ${formatDate(application.reviewed_at)}` : ""}</p>
              </div>
              {application.approval_status === "pending" ? (
                <div className="flex h-fit shrink-0 gap-2">
                  <button type="button" disabled={savingId === application.id} onClick={() => void decide(application, "approved")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button type="button" disabled={savingId === application.id} onClick={() => void decide(application, "rejected")} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-700 px-3 py-2 text-xs font-black text-white hover:bg-rose-800 disabled:opacity-50">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            <Clock3 className="mx-auto mb-3 h-6 w-6" />No partnership applications yet.
          </div>
        )}
      </section>
    </main>
  );
}
