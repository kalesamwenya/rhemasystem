"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Users } from "lucide-react";
import { assetUrl } from "@/lib/api";
import { loadAboutContent, type FacultyMember } from "@/lib/public-site-content";

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "?";
}

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    loadAboutContent()
      .then((data) => { if (active) setFaculty(data.faculty); })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load faculty profiles.");
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-12 pt-32 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span>Faculty</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Rhema Zambia</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-[#10283a] sm:text-6xl">Meet our faculty</h1>
          <p className="mt-5 max-w-3xl text-base font-medium leading-7 text-slate-700">
            Our instructors serve Rhema Zambia through biblical teaching, ministry experience and a commitment to equipping students for their calling.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-800"><Users size={23} /></div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-[#10283a] sm:text-3xl">Local instructors and ministry leaders</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Faculty are selected for their character, faith and experience. Their varied backgrounds help students connect biblical foundations with practical ministry. Staff team profiles are managed and presented separately on the About page.
          </p>
        </div>

        {isLoading && <p role="status" className="py-12 text-center text-sm text-slate-600">Loading faculty profiles...</p>}
        {loadError && <p role="alert" className="mx-auto mt-10 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{loadError}</p>}
        {!isLoading && !loadError && faculty.length === 0 && (
          <p className="mx-auto mt-10 max-w-2xl rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm leading-6 text-slate-600">
            Faculty profiles will appear here as they are approved for publication by the Rhema Zambia team.
          </p>
        )}

        {faculty.length > 0 && (
          <div className="mt-12 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 sm:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
            {faculty.map((person) => (
              <article key={person.id} className="group text-center">
                <div
                  tabIndex={0}
                  role="img"
                  aria-label={`${person.name}, ${person.role}`}
                  className="relative mx-auto flex aspect-square w-full max-w-48 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#142f50] text-3xl font-black text-white shadow-lg outline-none ring-1 ring-slate-200 transition duration-300 group-hover:scale-[1.03] group-hover:ring-blue-300 focus-visible:ring-4 focus-visible:ring-blue-400"
                  style={person.avatar_url ? { backgroundImage: `url("${assetUrl(person.avatar_url)}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                >
                  {!person.avatar_url && getInitials(person.name)}
                  <span className="absolute inset-0 flex flex-col items-center justify-center bg-[#10283a]/85 px-3 text-white opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                    <span className="text-sm font-black leading-tight">{person.name}</span>
                    <span className="mt-1 text-xs font-semibold text-sky-200">{person.role}</span>
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-black text-[#10283a]">{person.name}</h3>
                <p className="mt-1 text-xs font-bold text-blue-800">{person.role}</p>
                {person.bio && <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-600">{person.bio}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="bg-[#f4f5f4] px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Learn with Rhema</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#10283a]">Explore the training program.</h2>
          </div>
          <Link href="/offered-programs" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0645a5] px-5 py-3 text-sm font-black text-white transition hover:bg-blue-900">
            Explore academics <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
