import SiteFooter from "@/components/main/SiteFooter";
import SiteHeader from "@/components/main/SiteHeader";
import SiteChatbot from "@/components/main/SiteChatbot";

type ApplicationLayoutProps = {
  children: React.ReactNode;
};

export default function ApplicationLayout({ children }: ApplicationLayoutProps) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <SiteChatbot />
    </div>
  );
}
