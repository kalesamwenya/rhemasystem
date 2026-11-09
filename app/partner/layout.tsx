import PartnerWorkspaceLayout from "@/components/partners/PartnerWorkspaceLayout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <PartnerWorkspaceLayout>{children}</PartnerWorkspaceLayout>;
}
