"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { loadPublicCourses, type PublicCourse } from "@/lib/public-site-content";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

export default function OfferedProgramsPage() {
  const { content, error: contentError, isLoading: contentLoading } = useManagedPageContent("academics");
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    loadPublicCourses()
      .then((data) => { if (active) setCourses(data); })
      .catch((error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "Unable to load courses."); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  const cohorts = useMemo(() => {
    const grouped = new Map<number, PublicCourse[]>();
    courses.forEach((course) => {
      const cohortLabel = course.cohortName.trim();
      const normalizedLabel = cohortLabel.toUpperCase();
      const cohort = /\bFYM\b|\bFYE\b/.test(normalizedLabel)
        ? 1
        : /\bSYM\b|\bSYE\b/.test(normalizedLabel)
          ? 2
          : course.cohort;
      const cohortName = cohort === 1 && /\bFYM\b|\bFYE\b/.test(normalizedLabel)
        ? 'First Year (FYM + FYE)'
        : cohort === 2 && /\bSYM\b|\bSYE\b/.test(normalizedLabel)
          ? 'Second Year (SYM + SYE)'
          : cohortLabel;
      grouped.set(cohort, [...(grouped.get(cohort) ?? []), { ...course, cohort, cohortName }]);
    });
    return Array.from(grouped.entries()).sort(([first], [second]) => first - second);
  }, [courses]);

  if (contentLoading) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-sm text-slate-600">Loading academic information...</p>;
  if (contentError || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{contentError || "Academic information is unavailable."}</p>;

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-4xl whitespace-pre-line text-4xl font-black leading-[1.05] tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base font-medium leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>

      <section id="program" className="scroll-mt-28 mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.program_badge}</p>
          <h2 className="mt-3 whitespace-pre-line text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.program_title}</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{content.program_description}</p>
          <div className="mt-6 flex gap-3 rounded-xl border-l-4 border-blue-800 bg-rose-50/70 p-4">
            <CalendarDays size={19} className="mt-0.5 shrink-0 text-blue-900" />
            <p className="text-sm leading-6 text-slate-700">{content.calendar_note}</p>
          </div>
        </div>
        <div className="relative min-h-64 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d3155] to-blue-800 p-8 text-white shadow-xl">
          <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full border-[32px] border-white/10" />
          <div className="relative flex min-h-48 flex-col justify-end">
            <BookOpen size={30} className="text-sky-200" />
            <h3 className="mt-4 text-2xl font-black">{content.feature_title}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/85">{content.feature_description}</p>
          </div>
        </div>
      </section>

      <div id="courses" className="scroll-mt-28">
      {isLoading && <p role="status" className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600 sm:px-6 lg:px-8">Loading curriculum...</p>}
      {loadError && <p role="alert" className="mx-auto max-w-7xl px-4 py-6 text-sm font-medium text-red-800 sm:px-6 lg:px-8">{loadError}</p>}
      {!isLoading && !loadError && courses.length === 0 && <p className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-600 sm:px-6 lg:px-8">There are no public courses available at the moment.</p>}

      {cohorts.map(([cohort, cohortCourses], index) => (
        <section id={index === 0 ? undefined : `year-${cohort}`} key={cohort} className={index % 2 === 0 ? "bg-[#f4f5f4] py-14 sm:py-16" : "bg-white py-14 sm:py-16"}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Curriculum · {cohortCourses[0]?.cohortName || `Year ${cohort}`}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10283a] sm:text-4xl">{cohortCourses[0]?.cohortName || `Year ${cohort}`} courses</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{content.course_intro}</p>
            <ul className="mt-7 grid gap-3 sm:grid-cols-2">
              {cohortCourses.map((course) => (
                <li key={course.id} className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900">{course.course}</h3>
                  {course.description && <p className="mt-2 text-sm leading-6 text-slate-600">{course.description}</p>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
      </div>

      <section id="prayer-school" className="scroll-mt-28 bg-[#142f50] py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_0.7fr] lg:items-center lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-200">{content.prayer_badge}</p>
            <h2 className="mt-3 max-w-2xl whitespace-pre-line text-3xl font-black leading-tight sm:text-4xl">{content.prayer_title}</h2>
            <p className="mt-4 max-w-2xl whitespace-pre-line text-sm leading-7 text-white/85">{content.prayer_description}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-6">
            <h3 className="text-lg font-black">{content.prayer_card_title}</h3>
            <p className="mt-2 text-sm leading-6 text-white/80">{content.prayer_card_description}</p>
            <Link href="/contact" className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-blue-950 transition hover:bg-sky-100">{content.prayer_link_label} <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-[#f6f0e9] p-7 sm:p-10">
          <h2 className="text-3xl font-black tracking-tight text-[#10283a]">{content.cta_title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{content.cta_description}</p>
          <Link href="/apply" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0645a5] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900">{content.cta_link_label} <ArrowRight size={16} /></Link>
        </div>
      </section>
    </div>
  );
}
