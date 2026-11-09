import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/partnerships",
  "Community and Partnerships",
  "Stay connected through Rhema Zambia alumni, ministerial fellowship and partnership with the work of Rhema Zambia.",
);

export default function PartnershipsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
