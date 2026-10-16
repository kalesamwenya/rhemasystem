"use client";

import PageHero from "@/components/main/PageHero";
import SectionHeading from "@/components/main/SectionHeading";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

export default function TermsPage() {
  const { content, error, isLoading } = useManagedPageContent("terms");
  if (isLoading) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-sm text-slate-600">Loading terms of use...</p>;
  if (error || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{error || "Terms of use are unavailable."}</p>;

  const sections = [1, 2, 3, 4]
    .map((number) => ({
      title: content[`section_${number}_title`],
      text: content[`section_${number}_text`],
    }))
    .filter((section) => section.title.trim() || section.text.trim());

  return (
    <div>
      <PageHero
        badge={content.hero_badge}
        title={content.hero_title}
        description={content.hero_description}
        image="https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=1600"
        primaryAction={{ label: "Apply now", href: "/apply" }}
        secondaryAction={{ label: "View privacy", href: "/privacy" }}
      />

      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={content.section_badge}
          title={content.section_title}
          description={content.section_description}
        />

        <div className="mt-12 space-y-6">
          {sections.map((section, index) => (
            <div key={`${index}-${section.title}`} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-bold text-slate-900">{section.title}</h3>
              <p className="mt-3 text-base leading-8 text-slate-700">{section.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
