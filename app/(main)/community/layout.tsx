import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/community",
  "Community",
  "Learn about Rhema Zambia’s alumni community, ministry network, partnerships and ways to stay connected.",
);

export default function CommunityLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
