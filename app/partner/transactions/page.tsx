"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, ReceiptText } from "lucide-react";

type Contribution = {
  id: number;
  amount: string;
  currency: string;
  status: string;
  payment_reference: string | null;
  receipt_url: string | null;
  opportunity_title: string | null;
  created_at: string;
  confirmed_at: string | null;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

export default function PartnerTransactionsPage() {
  const [records, setRecords] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/portal", { cache: "no-store", credentials: "include" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load contribution records.");
      setRecords(data.pledges || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load contribution records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Finance record</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Contribution records</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Submitted pledges remain pending until Rhema verifies the contribution. Confirmed records include the reference and receipt provided by the team.</p>
      </header>
      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading records…</p> : records.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><th className="p-4">Opportunity</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Date</th><th className="p-4">Reference & receipt</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="p-4 font-bold text-slate-900">{record.opportunity_title || "Partnership contribution"}</td>
                    <td className="p-4 font-black">{record.currency} {Number(record.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${record.status === "confirmed" ? "bg-emerald-50 text-emerald-800" : record.status === "declined" ? "bg-rose-50 text-rose-800" : "bg-amber-50 text-amber-800"}`}>{record.status}</span></td>
                    <td className="p-4 text-slate-500">{formatDate(record.confirmed_at || record.created_at)}</td>
                    <td className="p-4">
                      {record.status === "confirmed" ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs">{record.payment_reference || "—"}</span>
                          {record.receipt_url ? <a href={record.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-blue-800 hover:underline"><ReceiptText className="h-3.5 w-3.5" /> View receipt <ExternalLink className="h-3 w-3" /></a> : <span className="text-xs text-slate-400">No receipt attached</span>}
                        </div>
                      ) : <span className="text-xs text-slate-400">Available after confirmation</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-sm text-slate-500"><ReceiptText className="mx-auto mb-3 h-6 w-6" />No contributions have been recorded yet.</div>}
      </section>
    </div>
  );
}
