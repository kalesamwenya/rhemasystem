"use client";

import Link from "next/link";
import { ArrowRight, Check, FileText, IdCard, UserRound } from "lucide-react";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

export default function ApplyPage() {
  const { content, error, isLoading } = useManagedPageContent("admissions");
  const requirementIcons = [IdCard, FileText, UserRound];

  if (isLoading) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-sm text-slate-600">Loading admissions information...</p>;
  if (error || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{error || "Admissions information is unavailable."}</p>;

  const steps = [1, 2, 3, 4].map((number) => ({
    title: content[`step_${number}_title`],
    description: content[`step_${number}_description`],
    action: number === 1,
  }));
  const requirements = [1, 2, 3].map((number) => ({
    title: content[`requirement_${number}_title`],
    description: content[`requirement_${number}_description`],
    icon: requirementIcons[number - 1],
  }));

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span>Admissions</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-4xl whitespace-pre-line text-4xl font-black leading-[1.03] tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-medium leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>

      <section id="how-to-apply" className="scroll-mt-28 mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:px-8 lg:py-16">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.steps_badge}</p>
          <h2 className="mt-2 text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.steps_title}</h2>
          {content.steps_description && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{content.steps_description}</p>}
          <ol className="mt-6 space-y-3">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-sm sm:p-6">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c8102e] text-sm font-black text-white">{index + 1}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-black leading-snug text-[#10283a]">{step.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{step.description}</p>
                  {step.action && <Link href="/application" className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#c8102e] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-red-900/10 transition hover:bg-red-800">{content.application_link_label} <ArrowRight size={14} /></Link>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-black text-[#10283a]">{content.links_title}</h2>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-600">
            <li><a href="#how-to-apply" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">How to apply</a></li>
            <li><a href="#requirements" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Requirements</a></li>
            <li><Link href="/application" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">2027 application form ↗</Link></li>
            <li><Link href="/login" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Student login ↗</Link></li>
            <li><Link href="/contact" className="block rounded-lg px-2 py-2 hover:bg-slate-50 hover:text-blue-800">Contact admissions</Link></li>
          </ul>
        </aside>
      </section>

      <section id="requirements" className="scroll-mt-28 bg-[#f6f0e9] py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.requirements_badge}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10283a] sm:text-4xl">{content.requirements_title}</h2>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {requirements.map(({ title, description, icon: Icon }) => (
              <article key={title} className="rounded-2xl bg-white p-5">
                <Icon size={21} className="text-blue-800" />
                <h3 className="mt-3 text-lg font-black text-[#10283a]">{title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
              </article>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-sm leading-6 text-slate-700">
            <Check size={18} className="mt-0.5 shrink-0 text-blue-800" />
            <p>{content.referee_note}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="relative overflow-hidden rounded-3xl bg-[#0645a5] px-7 py-10 text-white sm:px-10 sm:py-12">
          <div className="absolute -right-14 -top-28 h-72 w-72 rounded-full border-[32px] border-white/10" />
          <div className="relative max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-100">{content.help_badge}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{content.help_title}</h2>
            <p className="mt-3 text-sm leading-6 text-white/90">{content.help_description}</p>
            <Link href="/contact" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-blue-900 transition hover:bg-sky-50">{content.help_link_label}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
