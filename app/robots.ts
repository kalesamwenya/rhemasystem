import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/lecturer/",
          "/student/",
          "/application/status",
          "/login",
          "/forgot-password",
          "/reset-password",
          "/verify-payment",
          "/verify-profile",
          "/slips/",
          "/store/cart",
        ],
      },
    ],
    sitemap: new URL("/sitemap.xml", SITE_ORIGIN).toString(),
    host: SITE_ORIGIN,
  };
}
