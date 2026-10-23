import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/fee-structure",
  "Fees and Tuition Information",
  "Find information about fees and tuition at Rhema Zambia Bible Training Center and contact the school office with questions.",
);

export default function FeeStructureLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
