import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Testimony",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function TestimonyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
