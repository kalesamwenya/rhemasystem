import SiteHeader from "@/components/main/SiteHeader";
import SiteFooter from "@/components/main/SiteFooter";
import SiteChatbot from "@/components/main/SiteChatbot";

type MainLayoutProps = {
  children: React.ReactNode;
};

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <SiteChatbot />
    </div>
  );
}
