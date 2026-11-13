"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailX } from "lucide-react";
import { api } from "@/lib/api";

type Action = "confirm" | "unsubscribe";

export default function NewsletterTokenAction({ action }: { action: Action }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (action === "confirm") await api.newsletters.confirm(token);
      else await api.newsletters.unsubscribe(token);
      setFinished(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update your subscription.");
    } finally {
      setBusy(false);
    }
  };

  const title = action === "confirm" ? "Confirming your subscription" : "Manage your subscription";
  const successText = action === "confirm"
    ? "Your email is confirmed. Thanks for following the Emit Academy journey."
    : "You’ve been unsubscribed from Emit Academy newsletter emails.";

  return (
    <main className="flex min-h-[65vh] items-center justify-center px-4 py-16">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl sm:p-10">
        {finished ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /> : action === "confirm" ? <MailX className="mx-auto h-12 w-12 text-slate-500" /> : <MailX className="mx-auto h-12 w-12 text-rhema-red" />}
        <h1 className="mt-5 text-2xl font-black text-slate-950">{finished ? "You’re all set" : title}</h1>
        {finished ? <p className="mt-3 text-sm leading-6 text-slate-600">{successText}</p> : null}
        {!token ? <p role="alert" className="mt-3 text-sm text-rose-700">This link is incomplete. Please use the link from your email.</p> : null}
        {action === "confirm" && token && !finished ? <p className="mt-3 text-sm leading-6 text-slate-600">Confirm that you want to receive occasional stories, news, and opportunities from Emit Academy.</p> : null}
        {action === "unsubscribe" && token && !finished ? <p className="mt-3 text-sm leading-6 text-slate-600">Click below to stop receiving Emit Academy newsletter emails.</p> : null}
        {error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
        {token && !finished ? <button type="button" disabled={busy} onClick={submit} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-rhema-red px-5 py-3 text-sm font-black text-white disabled:opacity-60">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{busy ? "Updating…" : action === "confirm" ? "Confirm subscription" : "Unsubscribe"}</button> : null}
        <Link href="/community" className="mt-6 block text-sm font-bold text-blue-800 hover:underline">Return to the community page</Link>
      </section>
    </main>
  );
}
