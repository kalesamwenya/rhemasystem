"use client";

import PageHero from "@/components/main/PageHero";
import SectionHeading from "@/components/main/SectionHeading";
import { useManagedPageContent } from "@/lib/use-managed-page-content";
import MainPageSkeleton from "@/components/main/MainPageSkeleton";

export default function PrivacyPage() {
  const { content, error, isLoading } = useManagedPageContent("privacy");
  if (isLoading) return <MainPageSkeleton label="Loading privacy information" />;
  if (error || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{error || "Privacy information is unavailable."}</p>;

  const points = [1, 2, 3, 4, 5, 6]
    .map((number) => content[`point_${number}`])
    .filter((point) => point.trim());

  return (
    <div>
      <PageHero
        badge={content.hero_badge}
        title={content.hero_title}
        description={content.hero_description}
        image="https://images.pexels.com/photos/443383/pexels-photo-443383.jpeg?auto=compress&cs=tinysrgb&w=1600"
        primaryAction={{ label: "Contact us", href: "/contact" }}
        secondaryAction={{ label: "Read terms", href: "/terms" }}
      />

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={content.section_badge}
          title={content.section_title}
          description={content.section_description}
        />

        <div className="mt-12 space-y-6">
          {points.map((point, index) => (
            <div key={`${index}-${point}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">{index === 5 ? "Website assistant" : `0${index + 1}`}</p>
              <p className="mt-3 text-base leading-8 text-slate-700">{point}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
