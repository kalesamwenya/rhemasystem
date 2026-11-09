"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList, LayoutDashboard, LogOut, ReceiptText, Settings } from "lucide-react";

const links = [
  { href: "/partner", label: "Overview", icon: LayoutDashboard },
  { href: "/partner/needs", label: "Opportunities & pledges", icon: ClipboardList },
  { href: "/partner/transactions", label: "Contribution records", icon: ReceiptText },
  { href: "/partner/profile", label: "Partner profile", icon: Settings },
];

export default function PartnerWorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [partner, setPartner] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState("");

  const loadSession = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/portal", { cache: "no-store", credentials: "include" });
      if (response.status === 401) {
        router.replace("/partner-login");
        return;
      }
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to load your partner session.");
      setPartner(data.partner);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load your partner session.");
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSession(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSession]);

  const signOut = async () => {
    setError("");
    try {
      const response = await fetch("/api/partner/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "logout" }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to sign out.");
      router.replace("/partner-login");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 text-white md:flex">
        <Link href="/partner" className="border-b border-white/10 px-6 py-6 text-lg font-black">
          Rhema <span className="text-amber-400">Partners</span>
        </Link>
        <nav className="flex-1 space-y-2 p-4">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                pathname === href ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <p className="truncate text-sm font-bold">{partner?.name || "Partner account"}</p>
          <p className="truncate text-xs text-slate-400">{partner?.email || ""}</p>
          <button type="button" onClick={() => void signOut()} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Partner workspace</p>
              <p className="text-sm font-bold text-slate-800">{partner?.name || "Contribution center"}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold md:hidden">
              Sign out
            </button>
          </div>
          <nav className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto md:hidden">
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${pathname === href ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
                {label}
              </Link>
            ))}
          </nav>
        </header>
        {error ? (
          <div role="alert" className="mx-auto mt-5 max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <span>{error}</span>
              <button type="button" onClick={() => void loadSession()} className="shrink-0 font-bold underline">Retry</button>
            </div>
          </div>
        ) : null}
        <main className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
