import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/terms",
  "Website Terms of Use",
  "Review the terms and conditions for using the Rhema Zambia website and its online services.",
);

export default function TermsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
