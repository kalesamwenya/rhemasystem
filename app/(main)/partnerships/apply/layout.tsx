import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/partnerships/apply",
  "Partnership Enquiry",
  "Start a partnership conversation with Rhema Zambia. Share your organization details and proposed area of collaboration.",
);

export default function PartnershipApplicationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
