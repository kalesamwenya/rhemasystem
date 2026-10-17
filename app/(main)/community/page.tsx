"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useManagedPageContent } from "@/lib/use-managed-page-content";
import MainPageSkeleton from "@/components/main/MainPageSkeleton";

export default function CommunityPage() {
  const { content, error, isLoading } = useManagedPageContent("community");

  if (isLoading) return <MainPageSkeleton label="Loading community information" />;
  if (error || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{error || "Community information is unavailable."}</p>;

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-12 pt-32 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span>Community</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-3xl whitespace-pre-line text-4xl font-black leading-[1.04] tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-medium leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>

      <section id="alumni" className="scroll-mt-28 mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8 lg:py-16">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.alumni_badge}</p>
          <h2 className="mt-3 max-w-xl whitespace-pre-line text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.alumni_title}</h2>
          <p className="mt-4 max-w-xl whitespace-pre-line text-sm leading-7 text-slate-700">{content.alumni_description}</p>
          <a href="#rmai" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111318] px-5 py-3 text-xs font-black text-white transition hover:bg-blue-900">Learn about RMAI <ArrowRight size={14} /></a>
        </div>
        <div className="flex min-h-64 items-end rounded-3xl bg-gradient-to-br from-[#13365a] to-blue-800 p-7 text-white shadow-xl sm:min-h-80">
          <p className="max-w-sm whitespace-pre-line text-2xl font-black leading-tight sm:text-3xl">{content.alumni_callout}</p>
        </div>
      </section>

      <section id="rmai" className="scroll-mt-28 bg-gradient-to-r from-[#173e6e] to-[#10283a] py-12 text-white sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-200">{content.rmai_badge}</p>
            <h2 className="mt-3 max-w-lg whitespace-pre-line text-3xl font-black leading-tight sm:text-4xl">{content.rmai_title}</h2>
          </div>
          <div>
            <p className="whitespace-pre-line text-sm leading-7 text-white/85">{content.rmai_description}</p>
            <Link href="/contact#contact-details" className="mt-5 inline-flex rounded-full border border-white/50 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">Ask about RMAI</Link>
          </div>
        </div>
      </section>

      <section id="partnerships" className="scroll-mt-28 mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_260px] lg:px-8 lg:py-16">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.partnerships_badge}</p>
          <h2 className="mt-3 max-w-2xl whitespace-pre-line text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.partnerships_title}</h2>
          <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-slate-700">{content.partnerships_description}</p>
          <Link href="/contact#contact-details" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#c8102e] px-5 py-3 text-xs font-black text-white shadow-md shadow-red-900/10 transition hover:bg-red-800">Partnership details <ArrowRight size={14} /></Link>
        </div>
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-[#10283a]">{content.links_title}</h2>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
            <li><a href="#alumni" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Alumni association</a></li>
            <li><a href="#rmai" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">RMAI</a></li>
            <li><a href="#partnerships" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Partnership details</a></li>
            <li><Link href="/events" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Events and gatherings</Link></li>
            <li><Link href="/contact" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Contact the office</Link></li>
          </ul>
        </aside>
      </section>

      <section className="bg-[#f4f5f4] py-12 sm:py-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.events_badge}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10283a]">{content.events_title}</h2>
          </div>
          <Link href="/events" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0645a5] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900">View events <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
