import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/site-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return publicPageMetadata(
    `/events/${encodeURIComponent(id)}`,
    "Event Details",
    "Event details, registration information and updates from Rhema Zambia Bible Training Center.",
  );
}

export default function EventLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
