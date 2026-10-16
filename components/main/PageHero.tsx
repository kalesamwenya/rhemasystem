"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

type ActionLink = {
  label: string;
  href: string;
};

type PageHeroProps = {
  title: string;
  description: string;
  badge?: string;
  image?: string;
  primaryAction?: ActionLink;
  secondaryAction?: ActionLink;
};

export default function PageHero({
  title,
  description,
  badge = "Welcome",
  image = "https://images.pexels.com/photos/256455/pexels-photo-256455.jpeg?auto=compress&cs=tinysrgb&w=1600",
  primaryAction = { label: "Apply Now", href: "/apply" },
  secondaryAction = { label: "Learn More", href: "/about" },
}: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${image}')` }}
      />
      <div className="absolute inset-0 bg-slate-950/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/80 via-red-900/55 to-slate-900/50" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-red-200/60 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-50 backdrop-blur-sm">
            <CheckCircle2 size={14} className="text-red-300" />
            {badge}
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-white md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200 md:text-xl">
            {description}
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href={primaryAction.href}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500"
            >
              {primaryAction.label}
              <ArrowRight size={18} />
            </Link>
            <Link
              href={secondaryAction.href}
              className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              {secondaryAction.label}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
