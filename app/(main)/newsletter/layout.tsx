import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NewsletterActionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
