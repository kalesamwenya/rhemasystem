import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/about",
  "About Rhema Zambia",
  "Discover Rhema Zambia’s mission, vision, history, values, faculty and testimonies at our Bible Training Center in Lusaka.",
);

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
