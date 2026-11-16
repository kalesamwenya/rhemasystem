import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/about",
  "About",
  "Discover Emit Academy’s mission, vision, history, values, faculty and testimonies in Lusaka.",
);

export default function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
