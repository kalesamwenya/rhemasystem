"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ImagePlus } from "lucide-react";
import { api } from "@/lib/api";

const MAX_WORDS = 250;

type InviteState =
  | { status: "checking"; message: string }
  | { status: "valid"; token: string; message: string }
  | { status: "invalid"; message: string };

function countWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export default function SubmitTestimonyPage() {
  const [invite, setInvite] = useState<InviteState>({ status: "checking", message: "Checking your private invitation..." });
  const [name, setName] = useState("");
  const [testimony, setTestimony] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [trap, setTrap] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const wordCount = countWords(testimony);

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(window.location.search).get("token") ?? "";
    window.history.replaceState(window.history.state, "", window.location.pathname);
    Promise.resolve()
      .then(async () => {
        if (!/^[a-f0-9]{64}$/i.test(token)) {
          throw new Error("A private testimony invitation is required. Please use the secure link sent to your email.");
        }
        const response = await api.siteContent.validateTestimonyInvite(token) as { success: boolean; message?: string };
        if (!response.success) throw new Error(response.message ?? "This private invitation is invalid or expired.");
        if (active) setInvite({ status: "valid", token, message: "" });
      })
      .catch((validationError: unknown) => {
        if (active) setInvite({
          status: "invalid",
          message: validationError instanceof Error ? validationError.message : "Unable to validate this private invitation.",
        });
      });
    return () => {
      active = false;
    };
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (invite.status !== "valid") {
      setError("A valid private invitation is required to submit a testimony.");
      return;
    }
    if (wordCount > MAX_WORDS) {
      setError(`Please shorten your testimony to ${MAX_WORDS} words or fewer.`);
      return;
    }
    if (!avatar) {
      setError("Please choose an avatar image.");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("testimony", testimony.trim());
    formData.append("avatar", avatar);
    formData.append("token", invite.token);
    formData.append("website", trap);

    setIsSubmitting(true);
    try {
      const response = await api.siteContent.submitTestimony(formData) as { success: boolean; message?: string };
      if (!response.success) throw new Error(response.message ?? "Unable to submit your testimony.");
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit your testimony. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/about" className="inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800">
          <ArrowLeft size={16} /> Back to About
        </Link>
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
          {submitted ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={44} className="mx-auto text-emerald-600" />
              <h1 className="mt-5 text-3xl font-black text-slate-900">Thank you for sharing</h1>
              <p className="mt-3 leading-7 text-slate-600">Your testimony has been sent to our team for review. It will only appear on the website if an administrator approves it.</p>
              <Link href="/about" className="mt-7 inline-flex rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-600">Return to About</Link>
            </div>
          ) : invite.status === "checking" ? (
            <p role="status" className="py-8 text-center text-sm font-medium text-slate-600">{invite.message}</p>
          ) : invite.status === "invalid" ? (
            <div className="py-8 text-center">
              <h1 className="text-2xl font-black text-slate-900">Private invitation required</h1>
              <p role="alert" className="mt-3 leading-7 text-slate-600">{invite.message}</p>
              <p className="mt-3 text-sm text-slate-500">Please contact the school to request a private invitation by email.</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">Share your story</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Submit a testimony</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">We would love to hear your story. Your submission is private and will only be published after an administrator approves it.</p>
              <form onSubmit={submit} className="mt-8 space-y-5">
                <label className="block text-sm font-bold text-slate-700">
                  Your name
                  <input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Your testimony
                  <textarea required rows={7} value={testimony} onChange={(event) => setTestimony(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal leading-6 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" aria-describedby="testimony-word-count" />
                  <span id="testimony-word-count" className={`mt-1 block text-right text-xs ${wordCount > MAX_WORDS ? "font-bold text-red-700" : "text-slate-500"}`}>{wordCount}/{MAX_WORDS} words</span>
                </label>
                <label className="block text-sm font-bold text-slate-700">
                  Avatar photo
                  <span className="mt-2 flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm font-medium text-slate-600 hover:border-red-400 hover:bg-red-50/40">
                    <ImagePlus size={20} className="text-red-700" />
                    <span className="min-w-0 flex-1 truncate">{avatar?.name ?? "Choose a JPG, PNG, or WEBP image (up to 5 MB)"}</span>
                    <input required type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setAvatar(event.target.files?.[0] ?? null)} />
                  </span>
                </label>
                <label className="hidden" aria-hidden="true">
                  Leave this field blank
                  <input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
                </label>
                {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p>}
                <p className="text-xs leading-5 text-slate-500">By submitting, you are asking us to review your story. It will not be published without an administrator’s approval.</p>
                <button disabled={isSubmitting || wordCount > MAX_WORDS} type="submit" className="w-full rounded-xl bg-red-700 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSubmitting ? "Submitting..." : "Send testimony for review"}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
