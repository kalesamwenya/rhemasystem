"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock3, RefreshCw, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/api";

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
};

const statusClass = {
  approved: "bg-emerald-50 text-emerald-800",
  rejected: "bg-rose-50 text-rose-800",
  pending: "bg-amber-50 text-amber-800",
};

export default function PartnerApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [revealedApplication, setRevealedApplication] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [inviteSavingId, setInviteSavingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.partnerships.applications();
      setApplications(Array.isArray(response.applications) ? response.applications : []);
      setSelectedIds([]);
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

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return applications;
    return applications.filter((application) => [
      application.org_name,
      application.rep_name,
      application.email,
      application.phone,
      application.partner_type,
      application.area,
      application.approval_status,
    ].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [applications, search]);

  const pendingFilteredIds = filteredApplications
    .filter((application) => application.approval_status === "pending")
    .map((application) => application.id);
  const selectedPendingIds = selectedIds.filter((id) =>
    applications.some((application) => application.id === id && application.approval_status === "pending"));
  const allPendingSelected = pendingFilteredIds.length > 0
    && pendingFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((selectedId) => selectedId !== id);
      if (current.length >= 300) {
        setError("Select up to 300 applications per bulk action.");
        return current;
      }
      setError("");
      return [...current, id];
    });
  };

  const toggleAllPending = () => {
    setSelectedIds((current) => allPendingSelected
      ? current.filter((id) => !pendingFilteredIds.includes(id))
      : [...new Set([...current, ...pendingFilteredIds])]);
  };

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

  const approveSelected = async () => {
    if (!selectedPendingIds.length) return;
    if (!window.confirm(`Approve ${selectedPendingIds.length} selected pending application(s)?`)) return;
    setBulkSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.reviewApplications(selectedPendingIds);
      setMessage(response.message || `${response.approved_count || selectedPendingIds.length} application(s) approved.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to approve the selected applications.");
    } finally {
      setBulkSaving(false);
    }
  };

  const deleteApplications = async (ids) => {
    if (!ids.length) return;
    const countLabel = ids.length === 1 ? "this application" : `${ids.length} applications`;
    if (!window.confirm(`Permanently delete ${countLabel}? This cannot be undone.`)) return;
    setSavingId(ids.length === 1 ? ids[0] : "bulk");
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.deleteApplications(ids);
      setMessage(response.message || `${response.deleted_count || ids.length} application(s) deleted.`);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete the selected applications.");
    } finally {
      setSavingId(null);
    }
  };

  const sendSetupEmail = async (application) => {
    setInviteSavingId(application.id);
    setError("");
    setMessage("");
    try {
      const response = await api.partnerships.issueInvite(application.id);
      setMessage(response.email_sent === true
        ? `A new one-time account setup link was emailed to ${application.email}.`
        : response.email_sent === false
          ? `A setup link was created, but the email could not be sent. Check SMTP and portal URL settings. Use Partner management to copy and securely deliver the link to ${application.email}.`
          : `The API created a setup link but did not report email delivery. Deploy the updated PHP partnership API to enable branded email; use Partner management to securely copy the link for ${application.email}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send the partner setup email.");
    } finally {
      setInviteSavingId(null);
    }
  };

  const handleRowAction = (application, action) => {
    if (action === "reveal") setRevealedApplication(application);
    if (action === "approve") void decide(application, "approved");
    if (action === "reject") void decide(application, "rejected");
    if (action === "email") void sendSetupEmail(application);
    if (action === "delete") void deleteApplications([application.id]);
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Partner onboarding</p>
        <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-black">Partnership applications</h1>
            <p className="mt-2 text-sm text-slate-300">Review, approve, and manage submitted partnership proposals.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <Link href="/admin/partnerships" className="mt-4 inline-flex text-xs font-bold text-amber-300 hover:underline">Manage approved partners, opportunities, and pledges →</Link>
      </header>

      {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</div> : null}
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{error}</div> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organization, contact, email..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-slate-500">{selectedIds.length} selected</span>
            <button type="button" onClick={() => void approveSelected()} disabled={!selectedPendingIds.length || bulkSaving} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">
              <Check className="h-4 w-4" /> {bulkSaving ? "Approving..." : "Approve selected"}
            </button>
            <button type="button" onClick={() => void deleteApplications(selectedIds)} disabled={!selectedIds.length || savingId === "bulk"} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40">
              <Trash2 className="h-4 w-4" /> Delete selected
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading partnership applications...</div>
        ) : filteredApplications.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" aria-label="Select all pending applications shown" checked={allPendingSelected} onChange={toggleAllPending} disabled={!pendingFilteredIds.length} className="h-4 w-4 rounded border-slate-300" />
                  </th>
                  <th className="px-4 py-3">Organization / contact</th>
                  <th className="px-4 py-3">Collaboration</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.map((application) => (
                  <tr key={application.id} className="text-xs hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <input type="checkbox" aria-label={`Select ${application.org_name}`} checked={selectedIds.includes(application.id)} onChange={() => toggleSelected(application.id)} className="h-4 w-4 rounded border-slate-300" />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{application.org_name}</p>
                      <p className="mt-1 text-slate-600">{application.rep_name}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{application.email}{application.phone ? ` · ${application.phone}` : ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold capitalize text-slate-700">{application.support_type || "financial"}</p>
                      <p className="mt-1 max-w-xs truncate text-slate-500" title={application.area}>{application.area || "—"}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatDate(application.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${statusClass[application.approval_status] || "bg-slate-100 text-slate-700"}`}>{application.approval_status}</span>
                      {application.approval_status === "approved" ? <p className="mt-1 text-[10px] text-slate-500">{application.account_status || "Setup not accepted"}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        aria-label={`Actions for ${application.org_name}`}
                        value=""
                        disabled={savingId === application.id || inviteSavingId === application.id}
                        onChange={(event) => handleRowAction(application, event.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 disabled:opacity-50"
                      >
                        <option value="" disabled>Actions</option>
                        <option value="reveal">Reveal application</option>
                        {application.approval_status === "pending" ? <option value="approve">Approve</option> : null}
                        {application.approval_status === "pending" ? <option value="reject">Reject</option> : null}
                        {application.approval_status === "approved" && application.account_status !== "active" ? <option value="email">Send account setup email</option> : null}
                        <option value="delete">Delete application</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500">
            <Clock3 className="mx-auto mb-2 h-5 w-5" />
            {applications.length ? "No applications match your search." : "No partnership applications yet."}
          </div>
        )}
        {!loading && filteredApplications.length ? <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Showing {filteredApplications.length} of {applications.length} applications</div> : null}
      </section>

      {revealedApplication ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setRevealedApplication(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="revealed-application-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Partnership application</p>
                <h2 id="revealed-application-title" className="mt-1 text-xl font-black text-slate-950">{revealedApplication.org_name}</h2>
              </div>
              <button type="button" aria-label="Close application details" onClick={() => setRevealedApplication(null)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X className="h-4 w-4" /></button>
            </header>
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              <div><p className="text-[10px] font-black uppercase text-slate-400">Contact person</p><p className="mt-1 text-sm font-semibold">{revealedApplication.rep_name}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Email</p><a href={`mailto:${revealedApplication.email}`} className="mt-1 block break-all text-sm font-semibold text-blue-800 hover:underline">{revealedApplication.email}</a></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Phone</p><p className="mt-1 text-sm font-semibold">{revealedApplication.phone || "—"}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Organization type</p><p className="mt-1 text-sm font-semibold">{revealedApplication.partner_type}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Support type</p><p className="mt-1 text-sm font-semibold capitalize">{revealedApplication.support_type || "financial"}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Area of collaboration</p><p className="mt-1 text-sm font-semibold">{revealedApplication.area || "—"}</p></div>
              {revealedApplication.service_departments?.length ? <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase text-slate-400">Departments offered</p><p className="mt-1 text-sm font-semibold">{revealedApplication.service_departments.map((department) => department === "Other" && revealedApplication.other_department ? revealedApplication.other_department : department).join(", ")}</p></div> : null}
              <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase text-slate-400">Proposal</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{revealedApplication.details}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Application status</p><p className="mt-1 text-sm font-semibold capitalize">{revealedApplication.approval_status}</p></div>
              <div><p className="text-[10px] font-black uppercase text-slate-400">Submitted</p><p className="mt-1 text-sm font-semibold">{formatDate(revealedApplication.created_at)}</p></div>
              {revealedApplication.reviewed_at ? <div className="sm:col-span-2"><p className="text-[10px] font-black uppercase text-slate-400">Reviewed</p><p className="mt-1 text-sm font-semibold">{formatDate(revealedApplication.reviewed_at)}</p></div> : null}
            </div>
            <footer className="flex justify-end border-t border-slate-100 p-4">
              <button type="button" onClick={() => setRevealedApplication(null)} className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">Close</button>
            </footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}
