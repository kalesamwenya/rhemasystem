import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/partnerships",
  "Partner with Rhema Zambia",
  "Explore partnership opportunities with Rhema Zambia and learn how organizations can work with the Bible Training Center.",
);

export default function PartnershipsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
