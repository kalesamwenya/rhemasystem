import PartnerSetupForm from "@/components/partners/PartnerSetupForm";

export default async function PartnerSetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <PartnerSetupForm token={token} />;
}
