"use client";

import { Suspense } from "react";
import NewsletterTokenAction from "@/components/newsletters/NewsletterTokenAction";

export default function NewsletterConfirmPage() {
  return <Suspense fallback={<main className="min-h-[65vh]" />}><NewsletterTokenAction action="confirm" /></Suspense>;
}
