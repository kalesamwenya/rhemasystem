"use client";

import { useState } from "react";
import Link from "next/link";
import { GraduationCap, Menu, Search, ShoppingBag, ShoppingCart, X } from "lucide-react";
import { useStore } from "@/components/store/StoreContext";

const navItems = [{ href: "/store", label: "Home" }];

export default function StoreHeader() {
  const { cartCount, searchOpen, setSearchOpen, query, setQuery } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-[#0b1737] text-white shadow-lg shadow-slate-900/10">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/store" className="flex items-center gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-amber-500 border border-blue-800/60 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-black text-xs tracking-wider uppercase text-white leading-tight">EduPortal</span>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mt-0.5">Admin Workspace</span>
          </div>
        </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-slate-200 transition hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-1 items-center justify-end gap-3 lg:flex">
          {searchOpen ? (
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2.5">
              <Search size={16} className="shrink-0 text-slate-300" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." className="w-40 bg-transparent text-sm text-white outline-none placeholder:text-slate-400" />
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} className="text-slate-300 transition hover:text-white"><X size={15} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => setSearchOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"><Search size={16} /> Search</button>
          )}

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <ShoppingBag size={16} />
            Shop now
          </button>

          <Link href="/store/cart" className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label={`Open cart with ${cartCount} items`}>
            <ShoppingCart size={18} />
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            ) : null}
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="border-t border-slate-700 bg-[#0b1737] lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <button
              type="button"
              onClick={() => setSearchOpen((prev) => !prev)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
            >
              <Search size={16} />
              Search products
            </button>
            <Link href="/store/cart" onClick={() => setMobileOpen(false)} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              <ShoppingCart size={16} />
              Cart ({cartCount})
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
