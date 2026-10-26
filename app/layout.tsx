import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { EventsProvider } from "@/components/events/EventsContext";
import AlertProvider from "@/components/ui/AlertProvider";
import ActivityTracker from "@/components/ActivityTracker";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site-seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: SITE_NAME,
    template: "%s | Rhema Zambia",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "education",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "en_ZM",
    url: SITE_ORIGIN,
    images: [{ url: "/api/seo/og-image", width: 1200, height: 630, alt: `${SITE_NAME} homepage` }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/api/seo/og-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <EventsProvider>
          {children}
          <ActivityTracker />
          <AlertProvider />
        </EventsProvider>
      </body>
    </html>
  );
}
