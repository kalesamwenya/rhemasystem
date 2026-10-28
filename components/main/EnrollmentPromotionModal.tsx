"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, GraduationCap, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

const DISMISSED_KEY = "rhema_enrollment_promotion_dismissed_v1";

type EnrollmentStatusResponse = {
  data?: {
    enrollment_open?: boolean;
    application_years?: number[];
  };
};

export default function EnrollmentPromotionModal() {
  const [open, setOpen] = useState(false);
  const [applicationYears, setApplicationYears] = useState<number[]>([]);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closePromotion = useCallback(() => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch (cause) {
      console.warn("Enrollment promotion preference could not be saved.", cause);
    }
    setOpen(false);
  }, []);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(DISMISSED_KEY) === "true") return;
    } catch (cause) {
      console.warn("Enrollment promotion preference could not be read.", cause);
    }

    let active = true;
    api.admissions.getEnrollmentStatus()
      .then((response: EnrollmentStatusResponse) => {
        if (!active || response.data?.enrollment_open !== true) return;
        const years = Array.isArray(response.data.application_years)
          ? response.data.application_years.filter((year): year is number =>
            Number.isInteger(year) && year >= 2000 && year <= 2100,
          )
          : [];
        if (!years.length) return;
        setApplicationYears(years);
        setOpen(true);
      })
      .catch((cause: unknown) => {
        console.warn("Open enrollment status could not be checked for the website promotion.", cause);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePromotion();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="enrollment-promotion-title"]');
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [closePromotion, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/65 px-4 py-8 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Dismiss enrollment announcement"
        onClick={closePromotion}
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="enrollment-promotion-title"
        aria-describedby="enrollment-promotion-description"
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-950/30"
      >
        <div className="relative overflow-hidden bg-[#10283a] px-6 pb-8 pt-7 text-white sm:px-9 sm:pb-10 sm:pt-8">
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 rounded-full border-[28px] border-white/10" />
          <div aria-hidden="true" className="absolute -bottom-28 right-24 h-44 w-44 rounded-full border-[20px] border-amber-300/10" />
          <button
            type="button"
            ref={closeButtonRef}
            onClick={closePromotion}
            aria-label="Close enrollment announcement"
            className="absolute right-4 top-4 z-10 rounded-full border border-white/25 bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Applications now open
            </span>
            <div className="mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-[#10283a] shadow-lg shadow-black/10">
              <GraduationCap className="h-6 w-6" />
            </div>
            <h2 id="enrollment-promotion-title" className="mt-4 max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              Your next chapter starts here.
            </h2>
            <p id="enrollment-promotion-description" className="mt-3 max-w-lg text-sm leading-6 text-slate-100 sm:text-base">
              Applications to Rhema Zambia Bible Training Center are open for {applicationYears.join(", ")}. Explore your study options and take the first step today.
            </p>
          </div>
        </div>

        <div className="space-y-3 p-6 sm:p-8">
          <Link
            href="/application"
            onClick={closePromotion}
            className="group flex w-full items-center justify-between gap-4 rounded-2xl bg-rhema-red px-5 py-4 text-white shadow-lg shadow-red-900/10 transition hover:bg-rhema-red-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rhema-red focus-visible:ring-offset-2"
          >
            <span>
              <span className="block text-sm font-black">Start your application</span>
              <span className="mt-1 block text-xs text-white/85">Apply for {applicationYears.length === 1 ? applicationYears[0] : "an available year"}</span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 transition group-hover:translate-x-1" />
          </Link>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/apply"
              onClick={closePromotion}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c] focus-visible:ring-offset-2"
            >
              <BookOpen className="h-4 w-4 text-[#0f4c5c]" /> Admissions guide
            </Link>
            <Link
              href="/offered-programs"
              onClick={closePromotion}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c] focus-visible:ring-offset-2"
            >
              <GraduationCap className="h-4 w-4 text-[#0f4c5c]" /> Explore programs
            </Link>
          </div>
          <button
            type="button"
            onClick={closePromotion}
            className="w-full rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f4c5c]"
          >
            Maybe later
          </button>
        </div>
      </section>
    </div>
  );
}
