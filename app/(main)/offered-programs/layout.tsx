import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/offered-programs",
  "Bible Training Programs",
  "Explore biblical studies and practical ministry training programs offered by Rhema Zambia Bible Training Center.",
);

export default function ProgramsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
