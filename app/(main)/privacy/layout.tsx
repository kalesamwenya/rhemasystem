import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/privacy",
  "Privacy Policy",
  "Read how Rhema Zambia handles personal information when you use our website, contact the school or apply for admission.",
);

export default function PrivacyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
