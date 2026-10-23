import { NextResponse } from "next/server";
import { getPublicApiBaseUrl } from "@/lib/site-seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function GET() {
  const fallback = NextResponse.redirect(new URL("/logo.png", process.env.NEXT_PUBLIC_SITE_URL || "https://rhemasystem-78th.vercel.app"), 307);
  fallback.headers.set("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");

  try {
    const apiBaseUrl = getPublicApiBaseUrl();
    const aboutUrl = new URL("site-content/getAboutContent.php", `${apiBaseUrl}/`);
    const contentResponse = await fetch(aboutUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!contentResponse.ok) return fallback;

    const body = await contentResponse.json() as {
      success?: boolean;
      data?: { content?: { home_hero_image?: string | null } | null };
    };
    const imagePath = body.data?.content?.home_hero_image?.trim();
    if (!body.success || !imagePath) return fallback;

    const imageUrl = new URL(imagePath, `${apiBaseUrl}/`);
    if (imageUrl.origin !== new URL(apiBaseUrl).origin || !["http:", "https:"].includes(imageUrl.protocol)) {
      console.error("SEO hero image URL is outside the configured public API host.");
      return fallback;
    }

    const imageResponse = await fetch(imageUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const contentType = imageResponse.headers.get("content-type") || "";
    const contentLength = Number(imageResponse.headers.get("content-length") || 0);
    if (!imageResponse.ok || !contentType.startsWith("image/") || contentLength > MAX_IMAGE_BYTES) {
      console.error("The homepage hero image could not be served as a social preview.");
      return fallback;
    }

    const image = await imageResponse.arrayBuffer();
    if (image.byteLength === 0 || image.byteLength > MAX_IMAGE_BYTES) return fallback;
    return new NextResponse(image, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength),
        "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to resolve the homepage image for social sharing.", error);
    return fallback;
  }
}
