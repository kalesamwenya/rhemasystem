"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, Eye, Quote, Users } from "lucide-react";
import SectionHeading from "@/components/main/SectionHeading";
import MainPageSkeleton from "@/components/main/MainPageSkeleton";
import { assetUrl } from "@/lib/api";
import { loadAboutContent, type AboutPageContent } from "@/lib/public-site-content";

const pillarIcons = [Compass, Eye, Quote, Users];

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase() || "?";
}

export default function AboutPage() {
  const [pageContent, setPageContent] = useState<AboutPageContent | null>(null);
  const [loadError, setLoadError] = useState("");
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const scrollTestimonials = (direction: -1 | 1) => {
    const track = testimonialsRef.current;
    track?.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    loadAboutContent()
      .then(setPageContent)
      .catch((error: unknown) => setLoadError(error instanceof Error ? error.message : "Unable to load school information."));
  }, []);

  if (loadError) {
    return <p role="alert" className="mx-auto my-20 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{loadError}</p>;
  }

  if (!pageContent?.content) {
    return <MainPageSkeleton label="Loading school information" />;
  }

  const { content, team, testimonials } = pageContent;
  const pillars = [
    { title: content.mission_title, text: content.mission_text },
    { title: content.vision_title, text: content.vision_text },
    { title: content.motto_title, text: content.motto_text },
    { title: content.community_title, text: content.community_text },
  ].filter((pillar) => pillar.title.trim() && pillar.text.trim());
  const values = [
    { title: content.value_1_title, text: content.value_1_text },
    { title: content.value_2_title, text: content.value_2_text },
    { title: content.value_3_title, text: content.value_3_text },
    { title: content.value_4_title, text: content.value_4_text },
  ].filter((value) => value.title.trim() && value.text.trim());
  const faithStatements = content.faith_text.split(/\r?\n/).map((statement) => statement.trim()).filter(Boolean);

  return (
    <div>
      <section className="bg-[#f4f5f4] px-4 pb-14 pt-32 sm:px-6 sm:pb-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[1.05] tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>

      <section id="story" className="scroll-mt-28 mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-20">
        <div
          className="min-h-72 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0d3155] to-blue-800 bg-cover bg-center shadow-xl sm:min-h-96"
          role={content.hero_image ? "img" : undefined}
          aria-label={content.hero_image ? content.story_title : undefined}
          style={content.hero_image ? { backgroundImage: `url("${assetUrl(content.hero_image)}")` } : undefined}
        >
          {!content.hero_image && <div className="flex min-h-72 items-end p-7 text-white sm:min-h-96 sm:p-9"><p className="max-w-sm text-2xl font-black sm:text-3xl">Rhema Zambia<br />Bible Training Center</p></div>}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">We build the future</p>
          <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.story_title}</h2>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{content.story_text}</p>
          <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{content.community_text}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {pillars.length > 0 && (
          <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {pillars.map(({ title, text }, index) => {
              const Icon = pillarIcons[index % pillarIcons.length];
              return (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45 }}
                  className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                    <Icon size={24} />
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-slate-900">{title}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{text}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <section id="heritage" className="scroll-mt-28 bg-[#f4f5f4] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_280px] lg:px-8">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Heritage</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-tight text-[#10283a] sm:text-4xl">{content.heritage_title || "Our heritage"}</h2>
              <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-700">{content.heritage_text || "Details about Rhema Zambia’s heritage will be shared here."}</p>
              <div className="mt-6 rounded-r-xl border-l-4 border-blue-800 bg-rose-50/70 p-5">
                <p className="text-sm font-bold leading-6 text-slate-800">{content.motto_title}: {content.motto_text}</p>
              </div>
            </div>
            <nav aria-label="Explore about" className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-black text-[#10283a]">Explore About</h3>
              <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
                <li><a className="hover:text-blue-800" href="#heritage">Heritage</a></li>
                <li><a className="hover:text-blue-800" href="#faith">Statement of faith</a></li>
                <li><Link className="hover:text-blue-800" href="#team">Staff team</Link></li>
                <li><Link className="hover:text-blue-800" href="/faculty">Faculty</Link></li>
              </ul>
            </nav>
          </div>
      </section>

      <section id="faith" className="scroll-mt-28 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 sm:py-20">
          <SectionHeading eyebrow="Faith statements" title={content.faith_title || "What we believe"} />
          {faithStatements.length > 0 ? <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {faithStatements.map((statement, index) => (
              <li key={`${index}-${statement}`} className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-700 shadow-sm">
                {statement}
              </li>
            ))}
          </ul> : <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">Our statement of faith will be added here.</p>}
      </section>

      {values.length > 0 && (
        <section className="bg-slate-100 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Our values" title={content.values_title} description={content.values_description} />
            <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              {values.map((value) => (
                <div key={value.title} className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-slate-200">
                  <h3 className="text-xl font-bold text-slate-900">{value.title}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">{value.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="team" className="scroll-mt-28 bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Our staff team" title="Meet our dedicated staff team" description="Meet the staff and administrators serving Rhema Zambia. Focus on or hover over a portrait to see each person’s name and role. Faculty instructors are featured separately on the Faculty page." align="center" />
            {team.length > 0 ? <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-8 lg:grid-cols-4 xl:grid-cols-5">
              {team.map((person, index) => (
                <motion.article
                  key={person.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.35, delay: (index % 5) * 0.04 }}
                  className="group text-center"
                >
                  <div
                    tabIndex={0}
                    role="img"
                    aria-label={`${person.name}, ${person.role}`}
                    className="relative mx-auto flex aspect-square w-full max-w-48 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#142f50] text-2xl font-black text-white shadow-lg outline-none ring-1 ring-slate-200 transition duration-300 group-hover:scale-[1.03] group-hover:ring-blue-300 focus-visible:ring-4 focus-visible:ring-blue-400"
                    style={person.avatar_url ? { backgroundImage: `url("${assetUrl(person.avatar_url)}")`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {!person.avatar_url && getInitials(person.name)}
                    <span className="absolute inset-0 flex flex-col items-center justify-center bg-[#10283a]/85 px-3 text-white opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
                      <span className="text-sm font-black leading-tight">{person.name}</span>
                      <span className="mt-1 text-xs font-semibold text-sky-200">{person.role}</span>
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-black text-[#10283a]">{person.name}</p>
                  <p className="mt-1 text-xs font-medium text-slate-600">{person.role}</p>
                </motion.article>
              ))}
            </div> : <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-6 text-slate-600">Team profiles will be featured here as they are approved for publication.</p>}
          </div>
        </section>

      {testimonials.length > 0 && (
        <section id="testimonies" className="scroll-mt-28 bg-[#0b1737] py-20 text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading eyebrow="Testimonies" title="Stories from our community" />
              {testimonials.length > 1 && (
                <div className="flex shrink-0 gap-3 sm:pb-1">
                  <button
                    type="button"
                    aria-label="Show previous testimonies"
                    onClick={() => scrollTestimonials(-1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ArrowLeft size={20} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Show more testimonies"
                    onClick={() => scrollTestimonials(1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-600 text-white transition hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <ArrowRight size={20} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
            <div
              ref={testimonialsRef}
              role="region"
              aria-label="Community testimonies"
              className="mt-12 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4"
            >
              {testimonials.map((testimonial) => (
                <figure key={testimonial.id} className="min-w-0 w-full shrink-0 snap-start rounded-3xl border border-slate-700 bg-slate-900/80 p-7 md:w-[calc((100%-1.5rem)/2)] xl:w-[calc((100%-3rem)/3)]">
                  <div className="flex items-center gap-3">
                    {testimonial.avatar_url ? (
                      <div className="h-12 w-12 rounded-full bg-cover bg-center ring-2 ring-orange-400" role="img" aria-label={testimonial.author_name} style={{ backgroundImage: `url("${assetUrl(testimonial.avatar_url)}")` }} />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-amber-300 ring-2 ring-orange-400" aria-hidden="true">{getInitials(testimonial.author_name)}</div>
                    )}
                    <Quote size={24} className="text-red-300" aria-hidden="true" />
                  </div>
                  <blockquote className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-200">{testimonial.quote_text}</blockquote>
                  <figcaption className="mt-6 border-t border-slate-700 pt-4">
                    <p className="font-bold">{testimonial.author_name}</p>
                    {testimonial.author_role && <p className="mt-1 text-xs text-slate-400">{testimonial.author_role}</p>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-rhema-blue px-7 py-10 text-white sm:px-10 sm:py-12">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-100">Explore academics</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">See what you can learn at Rhema.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/90">Explore the two-year program and courses designed to build a strong foundation for life and ministry.</p>
          <a href="/offered-programs" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-blue-900 transition hover:bg-sky-50">Explore academics</a>
        </div>
      </section>
    </div>
  );
}
