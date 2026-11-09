"use client";

import { Suspense } from "react";
import NewsletterTokenAction from "@/components/newsletters/NewsletterTokenAction";

export default function NewsletterUnsubscribePage() {
  return <Suspense fallback={<main className="min-h-[65vh]" />}><NewsletterTokenAction action="unsubscribe" /></Suspense>;
}
