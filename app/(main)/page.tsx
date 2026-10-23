"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, HandHeart, MapPin, Users } from "lucide-react";
import { assetUrl } from "@/lib/api";
import SectionHeading from "@/components/main/SectionHeading";
import { loadAboutContent, loadPublicCourses, type AboutPageContent, type PublicCourse } from "@/lib/public-site-content";
import LoadingPlaceholder from "@/components/ui/LoadingPlaceholder";

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export default function HomePage() {
  const [content, setContent] = useState<AboutPageContent | null>(null);
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [contentError, setContentError] = useState("");
  const [coursesError, setCoursesError] = useState("");

  useEffect(() => {
    let active = true;
    loadAboutContent()
      .then((data) => { if (active) setContent(data); })
      .catch((error: unknown) => { if (active) setContentError(error instanceof Error ? error.message : "Unable to load website content."); });
    loadPublicCourses()
      .then((data) => { if (active) setCourses(data); })
      .catch((error: unknown) => { if (active) setCoursesError(error instanceof Error ? error.message : "Unable to load courses."); });
    return () => { active = false; };
  }, []);

  if (contentError) {
    return <p role="alert" className="mx-auto my-20 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{contentError}</p>;
  }
  if (!content) {
    return <LoadingPlaceholder variant="website" />;
  }
  if (!content.content) {
    return <p role="alert" className="mx-auto my-20 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">Homepage content is not configured in the website database.</p>;
  }

  const page = content.content;
  const values = [1, 2, 3, 4].map((index) => ({
    title: page[`value_${index}_title` as keyof typeof page] as string,
    text: page[`value_${index}_text` as keyof typeof page] as string,
  })).filter((item) => item.title.trim() && item.text.trim());
  const lifeCards = [1, 2, 3].map((index) => ({
    title: page[`life_card_${index}_title` as keyof typeof page] as string,
    description: page[`life_card_${index}_description` as keyof typeof page] as string,
    image: page[`life_card_${index}_image` as keyof typeof page] as string,
    linkLabel: page[`life_card_${index}_link_label` as keyof typeof page] as string,
    linkUrl: page[`life_card_${index}_link_url` as keyof typeof page] as string,
    Icon: [BookOpen, HandHeart, Users][index - 1],
  })).filter((card) => card.title.trim() || card.description.trim());
  const publishedStories = content.testimonials.slice(0, 3);
  const quickLinks = [
    { href: "/apply", title: "Apply to Rhema", detail: "Admissions process and requirements", icon: GraduationCap },
    { href: "/offered-programs", title: "Explore academics", detail: "Discover our two-year ministry program", icon: BookOpen },
    { href: "/login", title: "Student portal", detail: "Access your student account", icon: Users },
    { href: "/contact", title: "Visit the campus", detail: "Find us in Lusaka, Zambia", icon: MapPin },
  ];

  return (
    <div className="bg-white">
      <section
        className="relative flex min-h-[580px] items-end overflow-hidden bg-[#0b253d] bg-cover bg-center sm:min-h-[660px]"
        style={page.home_hero_image ? { backgroundImage: `url("${assetUrl(page.home_hero_image)}")` } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/45 to-slate-950/15" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-36 sm:px-6 sm:pb-28 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">{page.home_hero_badge}</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl lg:text-7xl">
            {page.home_hero_title}
          </h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-white/90 sm:text-lg">
            {page.home_hero_description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/apply" className="inline-flex items-center gap-2 rounded-full bg-rhema-accent px-6 py-3 text-sm font-black text-slate-950 transition hover:brightness-95">
              Apply to Rhema <ArrowRight size={17} />
            </Link>
            <Link href="/offered-programs" className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20">
              Explore academics
            </Link>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-8 grid max-w-7xl gap-2 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {quickLinks.map(({ href, title, detail, icon: Icon }) => (
          <Link key={title} href={href} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg shadow-slate-900/10 transition hover:-translate-y-1 hover:border-blue-200">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-800"><Icon size={19} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">{detail}</span>
            </span>
            <ArrowRight size={16} className="text-blue-800 transition group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {(
        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{page.hero_badge}</p>
            <h2 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">{page.story_title}</h2>
            <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-7 text-slate-700">{page.story_text}</p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-2 text-sm font-black text-blue-800 hover:text-blue-950">
              Discover who we are <ArrowRight size={16} />
            </Link>
          </div>
          <div className="relative min-h-72 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c3260] to-blue-800 p-8 text-white shadow-xl">
            {page.hero_image && <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url("${assetUrl(page.hero_image)}")` }} />}
            <div className="relative flex h-full min-h-56 flex-col justify-end">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">{page.motto_title || "Word + Practice"}</p>
              <h3 className="mt-3 max-w-md text-3xl font-black leading-tight">{page.motto_text || "Biblical foundations combined with practical ministry training."}</h3>
              <p className="mt-4 max-w-lg text-sm leading-6 text-white/85">{page.community_text}</p>
            </div>
          </div>
        </section>
      )}

      {lifeCards.length > 0 && (
        <section className="bg-[#f5f5f3] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{page.life_badge || "Life at Rhema"}</p>
            <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">{page.life_title}</h2>
            {page.life_description && <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{page.life_description}</p>}
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {lifeCards.map(({ title, description, image, linkLabel, linkUrl, Icon }) => {
                const href = linkUrl.startsWith("/") && !linkUrl.startsWith("//") ? linkUrl : "/offered-programs";
                return (
                  <article key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                    <div className="relative h-48 overflow-hidden bg-gradient-to-br from-[#173a5b] to-blue-800">
                      {image ? (
                        <div className="absolute inset-0 bg-cover bg-center" role="img" aria-label={title} style={{ backgroundImage: `url("${assetUrl(image)}")` }} />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-white/80"><Icon size={48} strokeWidth={1.4} /></div>
                      )}
                    </div>
                    <div className="min-h-48 p-5">
                      <h3 className="text-2xl font-black leading-tight tracking-tight text-[#10283a]">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                      {linkLabel && <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-black text-blue-800 hover:text-blue-950">{linkLabel} <ArrowRight size={15} /></Link>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {(
        <section className="bg-[#111318] py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">{page.community_title}</p>
            <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-end">
              <div>
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">{page.heritage_title}</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{page.heritage_text}</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-white/10 border-y border-white/10 sm:grid-cols-4 sm:divide-y-0">
                {[
                  { value: String(courses.length), label: "Courses in curriculum" },
                  { value: String(content.team.length), label: "Public ministry team" },
                  { value: String(publishedStories.length), label: "Featured stories" },
                  { value: "2 years", label: "Ministry program" },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 sm:px-5 sm:py-6">
                    <p className="text-2xl font-black sm:text-3xl">{stat.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {coursesError && <p role="alert" className="mx-auto max-w-7xl px-4 py-3 text-sm font-medium text-red-800">{coursesError}</p>}

      <section className="bg-[#f6f0e9] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{page.mission_title}</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#10283a] sm:text-5xl">{page.mission_text}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700">{page.vision_text}</p>
            <Link href="/offered-programs" className="mt-6 inline-flex rounded-full bg-[#111318] px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-900">View courses</Link>
          </div>
          <div className="space-y-3">
            {[
              ...values.map((value, index) => [`0${index + 1}`, value.title, value.text]),
            ].map(([number, title, text]) => (
              <article key={number} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-900">{number}</span>
                <div><h3 className="font-black text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {publishedStories.length > 0 && (
        <section className="bg-[#f4f5f4] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading eyebrow="Student stories" title={publishedStories.length ? page.community_title : page.values_title} />
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {publishedStories.map((story) => (
                <figure key={story.id} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <blockquote className="text-sm leading-6 text-slate-700">“{story.quote_text}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
                    {story.avatar_url ? (
                      <span className="h-10 w-10 rounded-full bg-cover bg-center" role="img" aria-label={story.author_name} style={{ backgroundImage: `url("${assetUrl(story.avatar_url)}")` }} />
                    ) : (
                      <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-black text-blue-900">{initials(story.author_name)}</span>
                    )}
                    <span><span className="block text-sm font-black text-slate-900">{story.author_name}</span><span className="block text-xs text-slate-500">{story.author_role || "Rhema student testimony"}</span></span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-rhema-blue px-7 py-12 text-white sm:px-12 sm:py-14">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-100">{page.motto_title}</p>
          <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight sm:text-5xl">{page.motto_text}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/90">{page.community_text}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/apply" className="rounded-full bg-white px-5 py-3 text-sm font-black text-blue-900 transition hover:bg-sky-50">How to apply</Link>
            <Link href="/contact" className="rounded-full border border-white/70 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10">Talk to admissions</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
