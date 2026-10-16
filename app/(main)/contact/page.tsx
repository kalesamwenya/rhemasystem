"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, PhoneCall } from "lucide-react";
import CustomAlert from "@/components/main/CustomAlert";
import { api } from "@/lib/api";
import { getChatbotSessionId } from "@/lib/chatbot";
import { useManagedPageContent } from "@/lib/use-managed-page-content";

type ContactAlertStatus = {
  type: "success" | "error" | "";
  title: string;
  message: string;
};

export default function ContactPage() {
  const { content, error: contentError, isLoading: contentLoading } = useManagedPageContent("contact");
  const [status, setStatus] = useState<ContactAlertStatus>({ type: "", title: "", message: "" });
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState({ map_url: "" });
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.chatbot.publicConfig()
      .then((response: { data?: { map_url?: string } }) => {
        if (active && response.data) setLocation({ map_url: response.data.map_url || "" });
      })
      .catch((error: unknown) => {
        if (active) setLocationError(error instanceof Error ? error.message : "School location could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus({ type: "", title: "", message: "" });
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setStatus({ type: "error", title: "Incomplete enquiry", message: "Please complete all fields so our team can respond." });
      return;
    }
    if (website) {
      setStatus({ type: "error", title: "Enquiry not sent", message: "Unable to submit this enquiry." });
      return;
    }

    setSubmitting(true);
    try {
      await api.chatbot.submitLead({
        session_id: getChatbotSessionId(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: "",
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        website,
        source_action: "contact",
        page_path: "/contact",
      });
      setStatus({ type: "success", title: "Enquiry sent", message: "Thank you for contacting Rhema Zambia. Our team will be in touch." });
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus({ type: "error", title: "Enquiry not sent", message: error instanceof Error ? error.message : "Unable to send your enquiry. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (contentLoading) return <p role="status" className="mx-auto max-w-7xl px-4 py-20 text-sm text-slate-600">Loading contact information...</p>;
  if (contentError || !content) return <p role="alert" className="mx-auto max-w-7xl px-4 py-20 text-sm font-medium text-red-800">{contentError || "Contact information is unavailable."}</p>;

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-12 pt-32 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span>Contact</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.hero_badge}</p>
          <h1 className="mt-3 max-w-4xl whitespace-pre-line text-4xl font-black leading-[1.04] tracking-tight text-[#10283a] sm:text-6xl">{content.hero_title}</h1>
          <p className="mt-5 whitespace-pre-line text-base font-medium leading-7 text-slate-700">{content.hero_description}</p>
        </div>
      </section>

      <section id="contact-details" className="scroll-mt-28 mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-12">
        <div className="space-y-3">
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-black text-slate-800">{content.phone_label}</p>
            <a href={`tel:${content.phone_number.replace(/[^\d+]/g, "")}`} className="mt-2 block text-sm font-bold text-blue-800 hover:underline">{content.phone_number}</a>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-black text-slate-800">{content.address_label}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{content.school_address}</p>
            {location.map_url && <a href={location.map_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-blue-800 hover:underline"><MapPin size={14} /> Open map ↗</a>}
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-black text-slate-800">{content.office_hours_label}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{content.office_hours}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-black text-slate-800">{content.portal_label}</p>
            <Link href="/login" className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-blue-800 hover:underline">{content.portal_link_label} ↗</Link>
          </article>
          {locationError && <p role="status" className="px-2 text-xs text-amber-800">Map location could not be refreshed. The contact form remains available.</p>}
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-[#f5f5f4] p-5 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-800">{content.form_badge}</p>
          <h2 className="mt-2 text-2xl font-black text-[#10283a]">{content.form_title}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold text-slate-700">Name
              <input required maxLength={160} autoComplete="name" value={formData.name} onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="block text-xs font-bold text-slate-700">Email
              <input required type="email" autoComplete="email" value={formData.email} onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
            </label>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-700">Topic
            <input required maxLength={160} value={formData.subject} onChange={(event) => setFormData((current) => ({ ...current, subject: event.target.value }))} placeholder="Admissions, academics, partnership..." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500" />
          </label>
          <label className="mt-4 block text-xs font-bold text-slate-700">Message
            <textarea required rows={5} maxLength={5000} value={formData.message} onChange={(event) => setFormData((current) => ({ ...current, message: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500" />
          </label>
          <label className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
          </label>
          <button type="submit" disabled={submitting} className="mt-5 rounded-full bg-[#c8102e] px-5 py-3 text-sm font-black text-white shadow-md shadow-red-900/10 transition hover:bg-red-800 disabled:cursor-wait disabled:opacity-60">{submitting ? "Sending..." : "Send enquiry"}</button>
          {status.message && <div className="mt-4"><CustomAlert type={status.type} title={status.title} message={status.message} onClose={() => setStatus({ type: "", title: "", message: "" })} /></div>}
        </form>
      </section>

      <section id="campus" className="scroll-mt-28 bg-[#f4f5f4] py-10 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">{content.campus_badge}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10283a] sm:text-4xl">{content.campus_title}</h2>
          <p className="mt-3 whitespace-pre-line text-sm font-semibold text-slate-700">{content.school_address}</p>
          {location.map_url && <a href={location.map_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-blue-800 shadow-sm hover:text-blue-950"><MapPin size={15} /> Directions to the campus ↗</a>}
          {!location.map_url && <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600"><PhoneCall size={15} /> Call ahead for directions and visitor arrangements.</p>}
        </div>
      </section>
    </div>
  );
}
