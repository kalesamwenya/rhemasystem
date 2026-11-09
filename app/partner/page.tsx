"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { HandCoins, Sparkles, Wallet, HeartHandshake } from "lucide-react";

type PortalData = {
  partner: { name: string };
  opportunities: Array<{ id: number; title: string; area: string; support_type: string; service_departments: string[]; target_amount: string | null; currency: string }>;
  pledges: Array<{ id: number; amount: string; currency: string; status: string }>;
  service_offers: Array<{ id: number; status: string }>;
};

const amount = (value: string | number, currency = "ZMW") =>
  `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const totalsByCurrency = (pledges: PortalData["pledges"]) => {
  const totals = pledges.reduce<Record<string, number>>((summary, pledge) => {
    const currency = pledge.currency || "ZMW";
    summary[currency] = (summary[currency] || 0) + Number(pledge.amount || 0);
    return summary;
  }, {});
  const entries = Object.entries(totals);
  return entries.length ? entries.map(([currency, total]) => amount(total, currency)).join(" · ") : amount(0);
};

export default function PartnerDashboardPage() {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/portal", { cache: "no-store", credentials: "include" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Unable to load the partner dashboard.");
      setData(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load the partner dashboard.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const pledges = data?.pledges || [];
  const totalPledged = totalsByCurrency(pledges);
  const confirmed = totalsByCurrency(pledges.filter((item) => item.status === "confirmed"));

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="rounded-3xl bg-slate-950 p-7 text-white sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Partner contribution center</p>
        <h1 className="mt-2 text-3xl font-black">Welcome{data?.partner?.name ? `, ${data.partner.name}` : ""}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Review opportunities to provide financial support or offer your time and skills to serve a Rhema department.</p>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Open opportunities", value: data ? String(data.opportunities.length) : "—", icon: Sparkles },
          { label: "Total pledged", value: totalPledged, icon: HandCoins },
          { label: "Confirmed contributions", value: confirmed, icon: Wallet },
          { label: "Service offers", value: data ? String(data.service_offers?.length || 0) : "—", icon: HeartHandshake },
        ].map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon className="h-5 w-5 text-blue-700" />
            <p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-blue-700">Ways to collaborate</p>
            <h2 className="mt-1 text-xl font-black">Open opportunities</h2>
          </div>
          <Link href="/partner/needs" className="text-sm font-bold text-blue-800 hover:underline">View all opportunities</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {(data?.opportunities || []).slice(0, 4).map((opportunity) => (
            <article key={opportunity.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-black text-slate-900">{opportunity.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{opportunity.area || "General partnership"}</p>
              <p className="mt-1 text-xs font-bold uppercase text-blue-800">{opportunity.support_type === "service" ? "Department service" : opportunity.support_type === "both" ? "Financial or service" : "Financial support"}</p>
              {opportunity.service_departments?.length ? <p className="mt-2 text-xs text-slate-600">{opportunity.service_departments.join(", ")}</p> : null}
              {opportunity.target_amount ? <p className="mt-3 text-sm font-bold">{amount(opportunity.target_amount, opportunity.currency)}</p> : null}
            </article>
          ))}
          {data && !data.opportunities.length ? <p className="text-sm text-slate-500">There are no open opportunities right now.</p> : null}
          {!data ? <p className="text-sm text-slate-500">Loading partner information…</p> : null}
        </div>
      </section>
    </div>
  );
}
