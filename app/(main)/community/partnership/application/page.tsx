import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PartnershipApplicationWizard from "@/components/partners/PartnershipApplicationWizard";

export default function CommunityPartnershipApplicationPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <section className="bg-slate-950 px-4 pb-12 pt-32 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Rhema Zambia · Community partnerships</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Start a partnership conversation.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Share a little about your organization and the work you would like to do with Rhema Zambia. Our team will review your application and follow up with you.</p>
        </div>
      </section>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/community#partnerships" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950">
          <ArrowLeft className="h-4 w-4" /> Back to community partnerships
        </Link>
        <PartnershipApplicationWizard />
      </div>
    </main>
  );
}
