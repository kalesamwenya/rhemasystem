import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/apply",
  "Admissions and How to Apply",
  "Review admissions requirements and application steps for studying at Emit Academy in Lusaka.",
);

export default function ApplyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
