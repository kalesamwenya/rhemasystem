"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

type HeaderLink = { href: string; label: string };
type NavigationItem = HeaderLink & { links?: HeaderLink[] };

const navigation: NavigationItem[] = [
  { href: "/", label: "Home" },
  {
    href: "/about",
    label: "About",
    links: [
      { href: "/about#story", label: "About Rhema" },
      { href: "/about#heritage", label: "Heritage" },
      { href: "/about#faith", label: "Statement of faith" },
      { href: "/about#team", label: "Staff team" },
      { href: "/faculty", label: "Faculty" },
    ],
  },
  {
    href: "/offered-programs",
    label: "Academics",
    links: [
      { href: "/offered-programs#program", label: "Two-year program" },
      { href: "/offered-programs#courses", label: "Courses" },
      { href: "/offered-programs#prayer-school", label: "Prayer school" },
      { href: "/faculty", label: "Faculty" },
    ],
  },
  {
    href: "/apply",
    label: "Admissions",
    links: [
      { href: "/apply#how-to-apply", label: "How to apply" },
      { href: "/apply#requirements", label: "Requirements" },
      { href: "/application", label: "2027 application form" },
      { href: "/login", label: "Portal sign in" },
    ],
  },
  {
    href: "/community",
    label: "Community",
    links: [
      { href: "/community#alumni", label: "Alumni association" },
      { href: "/community#rmai", label: "RMAI" },
      { href: "/community#partnerships", label: "Partnership details" },
    ],
  },
  { href: "/events", label: "Events" },
  { href: "/contact", label: "Contact" },
];

function isActive(pathname: string, href?: string): boolean {
  if (!href) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const usesTransparentHeader = !["/testimony", "/verify-profile", "/verify-payment"].includes(pathname);
  const isSolid = !usesTransparentHeader || isScrolled || mobileOpen;
  const transparentOnDarkHero = pathname === "/" || pathname.startsWith("/events/");
  const transparentTone = transparentOnDarkHero ? "text-white" : "text-slate-800";
  const linkTone = isSolid ? "text-slate-800" : transparentTone;

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 24);
    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
  }, []);

  useEffect(() => {
    const closeDropdownsOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      headerRef.current?.querySelectorAll("details[open]").forEach((dropdown) => {
        if (!dropdown.contains(target)) dropdown.removeAttribute("open");
      });
    };
    const closeDropdownsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      headerRef.current?.querySelectorAll("details[open]").forEach((dropdown) => dropdown.removeAttribute("open"));
    };
    document.addEventListener("pointerdown", closeDropdownsOutside);
    document.addEventListener("keydown", closeDropdownsOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeDropdownsOutside);
      document.removeEventListener("keydown", closeDropdownsOnEscape);
    };
  }, []);

  return (
    <header ref={headerRef} className={`${isSolid ? "fixed bg-white text-slate-900 shadow-md shadow-slate-950/5" : "absolute bg-transparent text-white"} inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300`}>
      <div className="h-6 bg-rhema-red text-white">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 text-[10px] font-semibold sm:px-6 lg:px-8">
          <span>Rhema Bible Training Center Zambia · Lusaka</span>
          <div className="flex items-center gap-3">
            <a href="tel:+260977480033" className="hidden hover:underline sm:inline">+260 977 480 033</a>
            <Link href="/login" className="hover:underline">Portal sign in</Link>
          </div>
        </div>
      </div>

      <div className={`border-b ${isSolid ? "border-slate-200" : "border-white/20"}`}>
        <div className="mx-auto flex min-h-[72px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Rhema Zambia home" className="flex shrink-0 items-center gap-2.5">
            <Image src="/logo.png" alt="" width={52} height={56} priority className="h-11 w-auto object-contain sm:h-12" />
            <span className="hidden leading-tight sm:block">
              <span className={`block text-sm font-black ${isSolid ? "text-rhema-red" : transparentOnDarkHero ? "text-white" : "text-rhema-red"}`}>Rhema Zambia</span>
              <span className={`mt-0.5 block text-[9px] font-bold uppercase tracking-[0.12em] ${isSolid ? "text-slate-500" : transparentOnDarkHero ? "text-white/85" : "text-slate-500"}`}>Bible Training Center</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => {
              if (item.links) {
                const active = item.links.some((link) => {
                  const targetPath = link.href.split("#")[0];
                  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
                });
                return (
                  <details key={item.label} className="group relative">
                    <summary className={`flex cursor-pointer list-none items-center gap-1 rounded-full px-3.5 py-3 text-sm font-bold transition hover:bg-slate-100/90 ${isSolid ? active ? "text-rhema-red" : linkTone : `${active && transparentOnDarkHero ? "text-white" : linkTone} ${transparentOnDarkHero ? "hover:text-slate-900" : "hover:text-rhema-red"}`}`}>
                      {item.label}
                      <ChevronDown size={14} className="transition group-open:rotate-180" />
                    </summary>
                    <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl shadow-slate-950/10">
                      {item.links.map((link) => (
                        <Link key={link.href} href={link.href} onClick={(event) => event.currentTarget.closest("details")?.removeAttribute("open")} className="block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 hover:text-rhema-red">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                );
              }
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`rounded-full px-3.5 py-3 text-sm font-bold transition hover:bg-slate-100/90 ${active ? "text-rhema-red" : linkTone} ${!isSolid ? transparentOnDarkHero ? "hover:text-slate-900" : "hover:text-rhema-red" : ""}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <Link href="/login" className={`rounded-full border px-4 py-2.5 text-xs font-bold transition ${isSolid ? "border-slate-200 text-slate-800 hover:bg-slate-50" : "border-white/60 text-white hover:bg-white/10"}`}>
              Portal sign in
            </Link>
            <Link href="/apply" className="rounded-full bg-rhema-accent px-4 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-orange-900/10 transition hover:brightness-95">
              Apply now
            </Link>
          </div>

          <button type="button" className={`inline-flex h-10 w-10 items-center justify-center rounded-full border lg:hidden ${isSolid ? "border-slate-200 text-slate-800" : "border-white/50 text-white"}`} onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="max-h-[calc(100vh-6rem)] overflow-y-auto border-b border-slate-200 bg-white px-4 py-3 text-slate-800 shadow-lg lg:hidden" aria-label="Mobile navigation">
          {navigation.map((item) => item.links ? (
            <details key={item.label} className="border-b border-slate-100">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-3 text-sm font-bold">
                {item.label}<ChevronDown size={16} />
              </summary>
              <div className="pb-2 pl-3">
                {item.links.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-rhema-red">
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          ) : (
            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-bold hover:bg-slate-50">
              {item.label}
            </Link>
          ))}
          <Link href="/apply" onClick={() => setMobileOpen(false)} className="mt-3 block rounded-full bg-rhema-accent px-5 py-3 text-center text-sm font-black text-slate-950">
            Apply now
          </Link>
        </nav>
      )}
    </header>
  );
}
