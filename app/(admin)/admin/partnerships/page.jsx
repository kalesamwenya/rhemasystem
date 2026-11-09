"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Plus, RefreshCw, Save, Users } from "lucide-react";
import { api } from "@/lib/api";

const initialOpportunity = {
  title: "",
  description: "",
  area: "",
  support_type: "financial",
  service_departments: [],
  target_amount: "",
  currency: "ZMW",
  target_date: "",
  status: "open",
};

const amount = (value, currency = "ZMW") =>
  `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function AdminPartnershipsPage() {
  const [data, setData] = useState({ partners: [], opportunities: [], pledges: [], service_offers: [] });
  const [form, setForm] = useState(initialOpportunity);
  const [invite, setInvite] = useState(null);
  const [pledgeDetails, setPledgeDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.partnerships.management();
      setData({
        partners: Array.isArray(response.partners) ? response.partners : [],
        opportunities: Array.isArray(response.opportunities) ? response.opportunities : [],
        pledges: Array.isArray(response.pledges) ? response.pledges : [],
        service_offers: Array.isArray(response.service_offers) ? response.service_offers : [],
      });
      setPledgeDetails((current) => {
        const next = { ...current };
        (response.pledges || []).forEach((pledge) => {
          if (!next[pledge.id]) next[pledge.id] = { payment_reference: pledge.payment_reference || "", receipt_url: pledge.receipt_url || "" };
        });
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load partnership management.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const issueInvite = async (partner) => {
    setBusy(`invite-${partner.application_id}`);
    setError("");
    setMessage("");
    setInvite(null);
    try {
      const response = await api.partnerships.issueInvite(partner.application_id);
      setInvite({
        name: partner.org_name,
        url: `${window.location.origin}/partner-setup?token=${encodeURIComponent(response.token)}`,
      });
      setMessage(response.message || (response.email_sent === undefined
        ? "The API created a one-time setup link but did not report email delivery. Deploy the updated PHP partnership API to enable branded email; the link below can be securely delivered manually."
        : "A one-time setup link was created. It expires in 48 hours."));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to create the partner setup link.");
    } finally {
      setBusy("");
    }
  };

  const copyInvite = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setMessage("Setup link copied to clipboard. Send it directly to the partner.");
    } catch {
      setMessage("Select and copy the setup link below, then send it directly to the partner.");
    }
  };

  const setAccountStatus = async (partner) => {
    const status = partner.account_status === "active" ? "disabled" : "active";
    setBusy(`account-${partner.application_id}`);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.setAccountStatus(partner.application_id, status);
      setMessage(response.message || "Partner account updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this partner account.");
    } finally {
      setBusy("");
    }
  };

  const saveOpportunity = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.saveOpportunity(form);
      setMessage(response.message || "Opportunity saved.");
      setForm(initialOpportunity);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this opportunity.");
    } finally {
      setSaving(false);
    }
  };

  const updateOpportunityStatus = async (opportunity) => {
    setBusy(`opportunity-${opportunity.id}`);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.saveOpportunity({ ...opportunity, status: opportunity.status === "open" ? "closed" : "open" });
      setMessage(response.message || "Opportunity updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this opportunity.");
    } finally {
      setBusy("");
    }
  };

  const updatePledge = async (pledge, status) => {
    setBusy(`pledge-${pledge.id}`);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.updatePledge({
        id: pledge.id,
        status,
        ...(pledgeDetails[pledge.id] || {}),
      });
      setMessage(response.message || "Pledge record updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this pledge.");
    } finally {
      setBusy("");
    }
  };

  const updateServiceOffer = async (offer, status) => {
    setBusy(`service-${offer.id}`);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.updateServiceOffer({ id: offer.id, status });
      setMessage(response.message || "Service offer updated.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this service offer.");
    } finally {
      setBusy("");
    }
  };

  const toggleDepartment = (department) => {
    setForm((current) => ({
      ...current,
      service_departments: current.service_departments.includes(department)
        ? current.service_departments.filter((item) => item !== department)
        : [...current.service_departments, department],
    }));
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Partner management</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">Partners & contributions</h1>
            <p className="mt-2 text-sm text-slate-300">Manage approved partner access, collaboration opportunities, and pledge confirmations.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold hover:bg-white/10 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      {invite ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-black text-blue-950">Setup link for {invite.name}</p>
              <p className="mt-1 text-xs text-blue-800">This URL contains a one-time credential. Deliver it securely; do not post or share it publicly.</p>
            </div>
            <button type="button" onClick={() => void copyInvite()} className="inline-flex items-center gap-2 rounded-lg bg-blue-900 px-3 py-2 text-xs font-bold text-white"><Copy className="h-4 w-4" /> Copy link</button>
          </div>
          <input readOnly value={invite.url} aria-label="One-time partner setup link" onFocus={(event) => event.currentTarget.select()} className="mt-3 w-full rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-xs text-slate-700" />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center gap-2"><Users className="h-5 w-5 text-blue-700" /><h2 className="text-xl font-black text-slate-950">Approved partners</h2></div>
        {loading ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading partner directory…</p> : data.partners.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {data.partners.map((partner) => (
              <article key={partner.application_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><h3 className="font-black text-slate-950">{partner.org_name}</h3><p className="mt-1 text-sm text-slate-500">{partner.rep_name} · {partner.email}</p><p className="mt-1 text-xs text-slate-500">{partner.partner_type} · {partner.area}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${partner.account_status === "active" ? "bg-emerald-50 text-emerald-800" : partner.account_status === "disabled" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-600"}`}>{partner.account_status || "No portal account"}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {!partner.account_status || partner.account_status === "disabled" ? (
                    <button type="button" disabled={busy === `invite-${partner.application_id}`} onClick={() => void issueInvite(partner)} className="rounded-lg bg-blue-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy === `invite-${partner.application_id}` ? "Creating link…" : partner.account_status ? "Issue password setup/reset link" : "Create setup link"}</button>
                  ) : null}
                  {partner.account_status ? <button type="button" disabled={busy === `account-${partner.application_id}`} onClick={() => void setAccountStatus(partner)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">{partner.account_status === "active" ? "Disable access" : "Enable access"}</button> : null}
                </div>
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">Approved applications will appear here.</p>}
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={saveOpportunity} className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Collaboration</p><h2 className="mt-1 text-xl font-black">Add an opportunity</h2></div>
          <label className="block text-xs font-bold text-slate-700">Title
            <input required maxLength={180} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">Description
            <textarea required maxLength={5000} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
          </label>
          <label className="block text-xs font-bold text-slate-700">Ways partners can help
            <select value={form.support_type} onChange={(event) => setForm((current) => ({ ...current, support_type: event.target.value, service_departments: event.target.value === "financial" ? [] : current.service_departments, target_amount: event.target.value === "service" ? "" : current.target_amount }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal">
              <option value="financial">Financial or material support</option>
              <option value="service">Serve a department (non-monetary)</option>
              <option value="both">Financial support or serve a department</option>
            </select>
          </label>
          {["service", "both"].includes(form.support_type) ? (
            <fieldset className="rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-xs font-bold text-slate-700">Departments this opportunity supports *</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {["Academics", "Admissions", "Student Affairs", "Finance", "Chapel & Ministry", "Library", "Facilities", "Administration", "Information Technology", "Other"].map((department) => (
                  <label key={department} className="flex items-center gap-2 text-xs font-medium text-slate-700">
                    <input type="checkbox" checked={form.service_departments.includes(department)} onChange={() => toggleDepartment(department)} className="h-4 w-4 rounded border-slate-300" />
                    {department}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Area
              <input maxLength={160} value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Target date
              <input type="date" value={form.target_date} onChange={(event) => setForm((current) => ({ ...current, target_date: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Target amount (optional)
              <input type="number" min="0" step="0.01" disabled={form.support_type === "service"} value={form.support_type === "service" ? "" : form.target_amount} onChange={(event) => setForm((current) => ({ ...current, target_amount: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-normal disabled:bg-slate-100" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Currency
              <select value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal"><option>ZMW</option><option>USD</option><option>EUR</option><option>GBP</option></select>
            </label>
          </div>
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Plus className="h-4 w-4" />{saving ? "Saving…" : "Publish opportunity"}</button>
        </form>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><p className="text-xs font-black uppercase tracking-wider text-amber-700">Opportunity board</p><h2 className="mt-1 text-xl font-black">Published opportunities</h2></div>
          {data.opportunities.length ? data.opportunities.map((opportunity) => (
            <article key={opportunity.id} className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div><h3 className="font-bold text-slate-900">{opportunity.title}</h3><p className="mt-1 line-clamp-2 text-xs text-slate-500">{opportunity.description}</p><p className="mt-2 text-xs text-slate-500">{opportunity.area || "General"} · {opportunity.support_type === "service" ? "Service" : opportunity.support_type === "both" ? "Financial or service" : "Financial"}{opportunity.target_amount ? ` · ${amount(opportunity.target_amount, opportunity.currency)}` : ""}</p>{opportunity.service_departments?.length ? <p className="mt-1 text-xs text-blue-800">Departments: {opportunity.service_departments.join(", ")}</p> : null}</div>
              <button type="button" disabled={busy === `opportunity-${opportunity.id}`} onClick={() => void updateOpportunityStatus(opportunity)} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold ${opportunity.status === "open" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{opportunity.status === "open" ? "Close" : "Reopen"}</button>
            </article>
          )) : <p className="text-sm text-slate-500">No opportunities published yet.</p>}
        </section>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-xs font-black uppercase tracking-wider text-emerald-700">Review</p><h2 className="mt-1 text-xl font-black">Partner pledges</h2><p className="mt-1 text-xs text-slate-500">Mark a pledge confirmed only after the contribution has been verified. Attach the payment reference and receipt URL for the partner.</p></div>
        {data.pledges.length ? data.pledges.map((pledge) => (
          <article key={pledge.id} className="grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
            <div><h3 className="font-bold text-slate-900">{pledge.org_name}</h3><p className="mt-1 text-xs text-slate-500">{pledge.opportunity_title || "Opportunity"} · {pledge.rep_name} · {pledge.email}</p><p className="mt-2 font-black">{amount(pledge.amount, pledge.currency)} <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{pledge.status}</span></p>{pledge.note ? <p className="mt-2 text-xs text-slate-600">{pledge.note}</p> : null}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input aria-label="Payment reference" maxLength={120} placeholder="Payment reference" value={pledgeDetails[pledge.id]?.payment_reference || ""} onChange={(event) => setPledgeDetails((current) => ({ ...current, [pledge.id]: { ...current[pledge.id], payment_reference: event.target.value } }))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              <input aria-label="Receipt URL" type="url" maxLength={1000} placeholder="Receipt URL (optional)" value={pledgeDetails[pledge.id]?.receipt_url || ""} onChange={(event) => setPledgeDetails((current) => ({ ...current, [pledge.id]: { ...current[pledge.id], receipt_url: event.target.value } }))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
            </div>
            {pledge.status === "pledged" ? <div className="flex gap-2"><button type="button" disabled={busy === `pledge-${pledge.id}`} onClick={() => void updatePledge(pledge, "confirmed")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Confirm</button><button type="button" disabled={busy === `pledge-${pledge.id}`} onClick={() => void updatePledge(pledge, "declined")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Decline</button></div> : <button type="button" disabled={busy === `pledge-${pledge.id}`} onClick={() => void updatePledge(pledge, pledge.status === "confirmed" ? "declined" : "confirmed")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50">Update record</button>}
          </article>
        )) : <p className="text-sm text-slate-500">No partner pledges have been submitted yet.</p>}
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Department support</p><h2 className="mt-1 text-xl font-black">Partner service offers</h2><p className="mt-1 text-xs text-slate-500">Review non-monetary offers to support Rhema departments.</p></div>
        {data.service_offers.length ? data.service_offers.map((offer) => {
          const departments = Array.isArray(offer.departments) ? offer.departments : [];
          return (
            <article key={offer.id} className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center">
              <div><h3 className="font-bold text-slate-900">{offer.org_name}</h3><p className="mt-1 text-xs text-slate-500">{offer.opportunity_title || "Opportunity"} · {offer.rep_name} · {offer.email}</p><p className="mt-2 text-sm font-semibold text-blue-900">{departments.map((department) => department === "Other" && offer.other_department ? offer.other_department : department).join(", ")}</p>{offer.note ? <p className="mt-2 text-xs text-slate-600">{offer.note}</p> : null}<span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{offer.status}</span></div>
              {offer.status === "offered" ? <div className="flex gap-2"><button type="button" disabled={busy === `service-${offer.id}`} onClick={() => void updateServiceOffer(offer, "accepted")} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Accept offer</button><button type="button" disabled={busy === `service-${offer.id}`} onClick={() => void updateServiceOffer(offer, "declined")} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 disabled:opacity-50">Decline</button></div> : null}
            </article>
          );
        }) : <p className="text-sm text-slate-500">No department service offers have been submitted yet.</p>}
      </section>
    </main>
  );
}
