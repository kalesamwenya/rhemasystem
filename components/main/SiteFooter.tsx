"use client";

import Image from "next/image";
import Link from "next/link";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

export default function SiteFooter() {
  const { content, error, isLoading } = useManagedPageContent("contact");

  if (isLoading || error || !content) {
    return (
      <footer className="bg-rhema-blue px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Image src="/logo.png" alt="Rhema Zambia Bible Training Center" width={48} height={52} className="h-12 w-auto rounded bg-white p-1 object-contain" />
          <p role={error ? "alert" : "status"} className="text-sm text-blue-100">
            {error || (isLoading ? "Loading school contact details..." : "School contact details are unavailable.")}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-rhema-blue text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr_1.2fr]">
          <div>
            <Link href="/" aria-label="Rhema Zambia home" className="inline-flex rounded-lg bg-white p-2">
              <Image src="/logo.png" alt="Rhema Zambia Bible Training Center" width={64} height={68} className="h-16 w-auto object-contain" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
              {content.footer_description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">Explore</h3>
            <ul className="mt-5 space-y-3 text-sm text-blue-100">
              <li><Link href="/about" className="hover:text-white">About us</Link></li>
              <li><Link href="/offered-programs" className="hover:text-white">Academics</Link></li>
              <li><Link href="/apply" className="hover:text-white">Admissions</Link></li>
              <li><Link href="/community" className="hover:text-white">Community</Link></li>
              <li><Link href="/events" className="hover:text-white">Events</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">Resources</h3>
            <ul className="mt-5 space-y-3 text-sm text-blue-100">
              <li><Link href="/about#faith" className="hover:text-white">Statement of faith</Link></li>
              <li><Link href="/faculty" className="hover:text-white">Faculty</Link></li>
              <li><Link href="/about#team" className="hover:text-white">Staff team</Link></li>
              <li><Link href="/login" className="hover:text-white">Student portal</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">Visit</h3>
            <address className="mt-5 space-y-2 text-sm not-italic leading-6 text-blue-100">
              <p>{content.footer_address_line_1}</p>
              <p>{content.footer_address_line_2}</p>
              <a href={`tel:${content.phone_number.replace(/[^\d+]/g, "")}`} className="block hover:text-white">{content.phone_number}</a>
            </address>
          </div>
        </div>

        <div className="mt-12 border-t border-white/20 pt-6 text-xs text-blue-100">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {content.footer_school_name}. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
            </div>
            <p>{content.footer_school_name}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
