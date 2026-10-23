import SiteHeader from "@/components/main/SiteHeader";
import SiteFooter from "@/components/main/SiteFooter";
import SiteChatbot from "@/components/main/SiteChatbot";
import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_SOCIAL_IMAGE } from "@/lib/site-seo";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: "%s | Rhema Zambia",
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_ZM",
    url: SITE_ORIGIN,
    images: [{ url: SITE_SOCIAL_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} homepage` }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_SOCIAL_IMAGE],
  },
};

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: SITE_NAME,
              url: SITE_ORIGIN,
              logo: new URL("/logo.png", SITE_ORIGIN).toString(),
              description: SITE_DESCRIPTION,
              address: {
                "@type": "PostalAddress",
                addressLocality: "Lusaka",
                addressCountry: "ZM",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: SITE_NAME,
              url: SITE_ORIGIN,
              inLanguage: "en-ZM",
            },
          ]).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <SiteChatbot />
    </div>
  );
}
