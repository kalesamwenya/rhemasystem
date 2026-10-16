"use client";

import Link from "next/link";
import { ArrowRight, CircleDollarSign } from "lucide-react";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

export default function FeeStructurePage() {
  const { content, error, isLoading } = useManagedPageContent("fees");

  if (isLoading) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-sm text-slate-600">Loading fee information...</p>;
  if (error || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{error || "Fee information is unavailable."}</p>;

  return (
    <div className="min-h-[70vh] bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-4xl whitespace-pre-line text-4xl font-black leading-tight tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-3xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <CircleDollarSign size={30} className="text-blue-800" />
          <h2 className="mt-4 text-2xl font-black text-[#10283a]">{content.contact_title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{content.contact_description}</p>
          <Link href="/contact" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0645a5] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900">{content.contact_link_label} <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
