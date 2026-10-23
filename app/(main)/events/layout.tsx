import { publicPageMetadata } from "@/lib/site-seo";

export const metadata = publicPageMetadata(
  "/events",
  "Events and Gatherings",
  "Browse upcoming events, gatherings and ministry opportunities at Rhema Zambia.",
);

export default function EventsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
