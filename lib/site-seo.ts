import type { Metadata } from "next";

export const SITE_ORIGIN = getSiteOrigin();
export const SITE_NAME = "Rhema Zambia Bible Training Center";
export const SITE_DESCRIPTION =
  "Rhema Zambia equips believers for ministry through biblical education, practical training and spiritual formation in Lusaka, Zambia.";
export const SITE_SOCIAL_IMAGE = "/api/seo/og-image";

function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configuredOrigin || "https://rhemasystem-78th.vercel.app";
  return new URL(origin).origin;
}

export function publicPageMetadata(
  path: string,
  title: string,
  description: string,
): Metadata {
  const canonical = path === "/" ? "/" : `/${path.replace(/^\/+|\/+$/g, "")}`;
  const absoluteUrl = new URL(canonical, SITE_ORIGIN).toString();
  const imageUrl = new URL(SITE_SOCIAL_IMAGE, SITE_ORIGIN).toString();

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: absoluteUrl,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${SITE_NAME} homepage` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function getPublicApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  const baseUrl = configuredUrl || "https://firebrick-snail-772746.hostingersite.com";
  const parsedUrl = new URL(baseUrl);
  if (process.env.NODE_ENV === "production" && parsedUrl.hostname === "localruntest.com") {
    return "https://firebrick-snail-772746.hostingersite.com";
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("The public API URL must use HTTP or HTTPS.");
  }
  return parsedUrl.toString().replace(/\/$/, "");
}

export async function getPublishedPublicEvents() {
  const baseUrl = getPublicApiBaseUrl();
  const response = await fetch(new URL("events/getEvents.php", `${baseUrl}/`), {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Unable to load public events (${response.status}).`);
  const body = await response.json() as {
    success?: boolean;
    data?: Array<{ id?: string | number; title?: string; status?: string }>;
  };
  if (!body.success || !Array.isArray(body.data)) return [];
  return body.data.filter((event) =>
    event.id != null && (event.status || "").toLowerCase() === "published",
  );
}
