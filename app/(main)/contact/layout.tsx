import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/contact",
  "Contact",
  "Contact Emit Academy in Lusaka for admissions, program, campus and partnership enquiries.",
);

export default function ContactLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
