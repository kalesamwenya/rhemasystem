import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { FaFacebookF, FaInstagram, FaTiktok, FaYoutube } from "react-icons/fa6";

const socialLinks = [
  { href: "https://facebook.com", label: "Facebook", icon: FaFacebookF },
  { href: "https://instagram.com", label: "Instagram", icon: FaInstagram },
  { href: "https://tiktok.com", label: "TikTok", icon: FaTiktok },
  { href: "https://youtube.com", label: "YouTube", icon: FaYoutube },
];

export default function StoreFooter() {
  return (
    <footer className="bg-[#071327] text-slate-200">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-amber-500 border border-blue-800/60 shadow-inner">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col truncate">
            <span className="font-black text-xs tracking-wider uppercase text-white leading-tight">EduPortal</span>
            <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mt-0.5">Admin Workspace</span>
          </div>
        </div>
            <p className="mt-5 max-w-xs text-sm leading-7 text-slate-300">
              Our branded school essentials help students represent their school with pride, confidence, and a strong identity.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Shop</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li><Link href="/store" className="hover:text-white">All items</Link></li>
              <li><Link href="/store" className="hover:text-white">Caps & headwear</Link></li>
              <li><Link href="/store" className="hover:text-white">Bags & backpacks</Link></li>
              <li><Link href="/store" className="hover:text-white">Hoodies & shirts</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Support</h3>
            <ul className="mt-5 space-y-3 text-sm text-slate-300">
              <li><Link href="/contact" className="hover:text-white">Delivery info</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
              <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              <li><Link href="/about" className="hover:text-white">About school</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Follow</h3>
            <div className="mt-5 flex gap-3">
              {socialLinks.map(({ href, label, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-100 transition hover:border-red-500 hover:bg-red-600 hover:text-white"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-700 pt-6 text-sm text-slate-400">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Godfrey Academy Store. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-white">Privacy</Link>
              <Link href="/terms" className="hover:text-white">Terms</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
