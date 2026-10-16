import StoreFooter from "@/components/store/StoreFooter";
import StoreHeader from "@/components/store/StoreHeader";
import { StoreProvider } from "@/components/store/StoreContext";

type StoreLayoutProps = {
  children: React.ReactNode;
};

export default function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <StoreProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <StoreHeader />
        {children}
        <StoreFooter />
      </div>
    </StoreProvider>
  );
}
