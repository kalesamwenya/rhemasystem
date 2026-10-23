import type { MetadataRoute } from "next";
import { getPublishedPublicEvents, SITE_ORIGIN } from "@/lib/site-seo";

export const dynamic = "force-dynamic";

const publicPages = [
  "",
  "about",
  "offered-programs",
  "faculty",
  "community",
  "fee-structure",
  "apply",
  "events",
  "privacy",
  "terms",
  "contact",
  "partnerships",
  "partnerships/apply",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = publicPages.map((path) => ({
    url: new URL(path ? `/${path}` : "/", SITE_ORIGIN).toString(),
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "apply" || path === "offered-programs" ? 0.8 : 0.6,
  }));

  try {
    const events = await getPublishedPublicEvents();
    for (const event of events) {
      pages.push({
        url: new URL(`/events/${encodeURIComponent(String(event.id))}`, SITE_ORIGIN).toString(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("Unable to add public events to the sitemap.", error);
  }
  return pages;
}
