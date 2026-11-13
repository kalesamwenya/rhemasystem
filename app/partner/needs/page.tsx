"use client";

import { useCallback, useEffect, useState } from "react";
import { HandCoins, LoaderCircle } from "lucide-react";

type Opportunity = {
  id: number;
  title: string;
  description: string;
  area: string;
  support_type: "financial" | "service" | "both";
  service_departments: string[];
  target_amount: string | null;
  currency: string;
  target_date: string | null;
};

type PortalData = {
  opportunities: Opportunity[];
  service_offers: Array<{ id: number; departments: string[]; other_department: string; note: string | null; status: string; opportunity_title: string }>;
};

export default function PartnerNeedsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [serviceOffers, setServiceOffers] = useState<PortalData["service_offers"]>([]);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [departments, setDepartments] = useState<Record<number, string[]>>({});
  const [otherDepartments, setOtherDepartments] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/portal", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load opportunities.");
      setOpportunities((data as PortalData).opportunities || []);
      setServiceOffers((data as PortalData).service_offers || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load opportunities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitPledge = async (opportunity: Opportunity) => {
    setSavingId(opportunity.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/partner/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          opportunity_id: opportunity.id,
          amount: amounts[opportunity.id] || "",
          departments: departments[opportunity.id] || [],
          other_department: otherDepartments[opportunity.id] || "",
          note: notes[opportunity.id] || "",
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to submit your pledge.");
      setMessage(data.message);
      setAmounts((current) => ({ ...current, [opportunity.id]: "" }));
      setNotes((current) => ({ ...current, [opportunity.id]: "" }));
      setDepartments((current) => ({ ...current, [opportunity.id]: [] }));
      setOtherDepartments((current) => ({ ...current, [opportunity.id]: "" }));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit your pledge.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleDepartment = (opportunityId: number, department: string) => {
    setDepartments((current) => {
      const selected = current[opportunityId] || [];
      return {
        ...current,
        [opportunityId]: selected.includes(department)
          ? selected.filter((item) => item !== department)
          : [...selected, department],
      };
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">Needs marketplace</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Opportunities & pledges</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Choose an open Emit Academy partnership opportunity. Depending on the opportunity, you can pledge financial support, offer service to a department, or both. Monetary contributions are confirmed after payment is verified.</p>
      </header>

      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      {loading ? <p className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading open opportunities…</p> : null}
      {!loading && !opportunities.length ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No open opportunities are available right now.</p> : null}

      <section className="grid gap-5 lg:grid-cols-2">
        {opportunities.map((opportunity) => (
          <article key={opportunity.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-amber-700">{opportunity.area || "Partnership opportunity"}</p>
                <h2 className="mt-2 text-xl font-black text-slate-900">{opportunity.title}</h2>
                <p className="mt-1 text-xs font-bold uppercase text-blue-800">{opportunity.support_type === "service" ? "Department service" : opportunity.support_type === "both" ? "Financial or department service" : "Financial support"}</p>
              </div>
              {opportunity.target_amount ? <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{opportunity.currency} {Number(opportunity.target_amount).toLocaleString()}</span> : null}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{opportunity.description}</p>
            {opportunity.target_date ? <p className="mt-3 text-xs text-slate-500">Target date: {opportunity.target_date}</p> : null}
            <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              {opportunity.support_type !== "service" ? (
                <label className="block text-xs font-bold text-slate-700">Pledge amount ({opportunity.currency}){opportunity.support_type === "financial" ? " *" : " (optional)"}
                  <input type="number" min="0.01" step="0.01" required={opportunity.support_type === "financial"} value={amounts[opportunity.id] || ""} onChange={(event) => setAmounts((current) => ({ ...current, [opportunity.id]: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
                </label>
              ) : null}
              {opportunity.support_type !== "financial" ? (
                <fieldset className="rounded-xl border border-slate-200 p-3">
                  <legend className="px-1 text-xs font-bold text-slate-700">Departments you can serve *</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(opportunity.service_departments || []).map((department) => (
                      <label key={department} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={(departments[opportunity.id] || []).includes(department)} onChange={() => toggleDepartment(opportunity.id, department)} className="h-4 w-4 rounded border-slate-300" />
                        {department}
                      </label>
                    ))}
                  </div>
                  {(departments[opportunity.id] || []).includes("Other") ? (
                    <label className="mt-3 block text-xs font-bold text-slate-700">Specify other department *
                      <input required maxLength={160} value={otherDepartments[opportunity.id] || ""} onChange={(event) => setOtherDepartments((current) => ({ ...current, [opportunity.id]: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
                    </label>
                  ) : null}
                </fieldset>
              ) : null}
              <label className="block text-xs font-bold text-slate-700">Note (optional)
                <textarea maxLength={2000} rows={2} value={notes[opportunity.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [opportunity.id]: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" />
              </label>
              <button type="button" disabled={savingId === opportunity.id} onClick={() => void submitPledge(opportunity)} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                {savingId === opportunity.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <HandCoins className="h-4 w-4" />}
                {opportunity.support_type === "service" ? "Offer to serve" : "Submit support"}
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">Your collaboration</p>
          <h2 className="mt-1 text-xl font-black text-slate-950">Department service offers</h2>
        </div>
        {serviceOffers.length ? serviceOffers.map((offer) => (
          <article key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">{offer.opportunity_title || "Partnership opportunity"}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase text-slate-600">{offer.status}</span>
            </div>
            <p className="mt-2 text-sm text-blue-900">{offer.departments.map((department) => department === "Other" && offer.other_department ? offer.other_department : department).join(", ")}</p>
            {offer.note ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{offer.note}</p> : null}
          </article>
        )) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">You have not submitted any department service offers.</p>}
      </section>
    </div>
  );
}
