"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  MessageCircle,
  Send,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { getChatbotSessionId } from "@/lib/chatbot";

type ChatMessage = {
  from: "bot" | "user";
  text: string;
  link?: { label: string; href: string };
  prompts?: string[];
};
type ChatContext = { label: string; greeting: string; prompts: string[] };
type ChatbotLocation = { school_address: string; map_url: string };

const contextForPath = (pathname: string): ChatContext => {
  if (pathname.startsWith("/offered-programs")) return { label: "Programs advisor", greeting: "Hi there! Looking at our programs? I can help you compare your options or connect you with the school team.", prompts: ["Which programs are available?", "Tell me about courses"] };
  if (pathname.startsWith("/fee-structure")) return { label: "Admissions guide", greeting: "Hello! I can help you understand the fees and figure out the next step. What would you like to know?", prompts: ["What are the fees?", "How do I apply?"] };
  if (pathname.startsWith("/events")) return { label: "Events concierge", greeting: "Hi! I can help you find an upcoming event or walk you through registration.", prompts: ["What events are coming up?", "How do I register?"] };
  if (pathname.startsWith("/apply") || pathname.startsWith("/application")) return { label: "Admissions guide", greeting: "Hello! Applying can raise a lot of questions. I can help with the application or entry requirements.", prompts: ["How do I apply?", "What are the entry requirements?"] };
  if (pathname.startsWith("/contact")) return { label: "School support", greeting: "Hi there! Tell me what you need help with and I’ll point you in the right direction.", prompts: ["Talk to admissions", "Where is the school located?"] };
  return { label: "Rhema assistant", greeting: "Welcome to Rhema Zambia. I can help with the ministry program, admissions, events or finding the school team.", prompts: ["Explore courses", "How do I apply?"] };
};

const actionLinks = [
  { label: "Apply now", href: "/application", source: "admissions" },
  { label: "Contact us", href: "/contact", source: "contact" },
  { label: "Register for an event", href: "/events", source: "events" },
] as const;

export default function SiteChatbot() {
  const pathname = usePathname();
  const context = contextForPath(pathname);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSent, setLeadSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [serviceError, setServiceError] = useState("");
  const [location, setLocation] = useState<ChatbotLocation | null>(null);
  const [lead, setLead] = useState({ name: "", email: "", phone: "", enquiry: "" });
  const conversationEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    conversationEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    let active = true;
    api.chatbot.publicConfig()
      .then((response: { data?: ChatbotLocation }) => {
        if (active && response.data) setLocation(response.data);
      })
      .catch((error: unknown) => {
        if (active) setServiceError(error instanceof Error ? error.message : "School location could not be loaded.");
      });
    return () => { active = false; };
  }, []);

  const requestAnswer = async (question: string) => {
    const message = question.trim();
    if (!message || pending) return;
    setMessages((current) => [...current, { from: "user", text: message }]);
    setInput("");
    setServiceError("");
    setPending(true);
    try {
      const response = await api.chatbot.interact({
        session_id: getChatbotSessionId(),
        event_type: "message",
        message,
        page_path: pathname,
      }) as { data?: { reply?: string; action_label?: string; action_url?: string; follow_up_prompts?: string[] } };
      if (!response.data?.reply) throw new Error("The chatbot did not return a response. Please try again or contact the school.");
      const href = response.data.action_url || "";
      const allowedHrefs = [
        "/about",
        "/about#team",
        "/about#testimonies",
        "/application",
        "/apply",
        "/community",
        "/contact",
        "/events",
        "/faculty",
        "/offered-programs",
        "/fee-structure",
      ];
      const link = response.data.action_label && allowedHrefs.includes(href)
        ? { label: response.data.action_label, href }
        : undefined;
      setMessages((current) => [...current, {
        from: "bot",
        text: response.data!.reply!,
        link,
        prompts: Array.isArray(response.data?.follow_up_prompts)
          ? response.data.follow_up_prompts.filter((prompt): prompt is string => typeof prompt === "string").slice(0, 3)
          : [],
      }]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "The chatbot is temporarily unavailable. Please use the contact page.";
      setServiceError(messageText);
      setMessages((current) => [...current, { from: "bot", text: "I could not send that question right now. Please use the contact page or try again shortly.", link: { label: "Contact the school", href: "/contact" } }]);
    } finally {
      setPending(false);
    }
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    void requestAnswer(input);
  };

  const submitLead = async (event: FormEvent) => {
    event.preventDefault();
    setServiceError("");
    setPending(true);
    try {
      await api.chatbot.submitLead({
        ...lead,
        session_id: getChatbotSessionId(),
        source_action: "admissions",
        page_path: pathname,
      });
      setLeadSent(true);
      setMessages((current) => [...current, { from: "bot", text: `Thank you, ${lead.name.trim().split(/\s+/)[0]}. Your enquiry has been sent to the school team.` }]);
    } catch (error) {
      setServiceError(error instanceof Error ? error.message : "Your enquiry could not be sent. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const trackAction = (label: string, target: string) => {
    void api.chatbot.interact({
      session_id: getChatbotSessionId(),
      event_type: "action",
      action_label: label,
      action_target: target,
      page_path: pathname,
    }).catch((error: unknown) => {
      setServiceError(error instanceof Error ? error.message : "The chatbot action could not be recorded.");
    });
  };

  return <>
    {open && <div className="fixed inset-0 z-[90] bg-slate-950/20 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="fixed bottom-5 right-4 z-[100] sm:right-6">
      {open ? <section className="w-[min(92vw,23rem)] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/20" aria-label="School assistant">
        <header className="bg-red-700 px-5 py-4 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15"><Sparkles size={19} /></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100">{context.label}</p><h2 className="mt-1 text-base font-black">Rhema Zambia</h2></div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white hover:bg-white/15" aria-label="Close school assistant"><X size={18} /></button>
          </div>
        </header>
        <div className="max-h-[min(55vh,25rem)] space-y-3 overflow-y-auto bg-slate-50 p-4" aria-live="polite" aria-label="Chat conversation">
          <div className="flex gap-2"><div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><Sparkles size={14} /></div><p className="rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 text-xs leading-5 text-slate-700 shadow-sm">{context.greeting}</p></div>
          {messages.map((message, index) => <div key={`${message.text}-${index}`} className={`flex gap-2 ${message.from === "user" ? "justify-end" : ""}`}>
            {message.from === "bot" && <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><Sparkles size={14} /></div>}
            <div className="max-w-[85%]">
              <div className={`rounded-2xl px-3 py-2.5 text-xs leading-5 ${message.from === "user" ? "rounded-tr-sm bg-slate-900 text-white" : "rounded-tl-sm bg-white text-slate-700 shadow-sm"}`}>
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.link && <Link href={message.link.href} onClick={() => { trackAction(message.link!.label, message.link!.href); setOpen(false); }} className="mt-1 inline-flex items-center gap-1 font-black text-red-700">{message.link.label} <ArrowRight size={12} /></Link>}
              </div>
              {message.from === "bot" && index === messages.length - 1 && !!message.prompts?.length && !leadOpen && <div className="mt-2 flex flex-wrap gap-1.5">{message.prompts.map((prompt) => <button type="button" key={prompt} disabled={pending} onClick={() => void requestAnswer(prompt)} className="rounded-full border border-red-200 bg-white px-2.5 py-1.5 text-left text-[10px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{prompt}</button>)}</div>}
            </div>
          </div>)}
          {pending && <div className="flex items-center gap-2" role="status" aria-label="Assistant is typing"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700"><Sparkles size={14} /></div><div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3 py-3 shadow-sm"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" /></div><span className="text-[10px] text-slate-400">Replying</span></div>}
          {serviceError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{serviceError}</p>}
          {!leadOpen && messages.length === 0 && <div className="flex flex-wrap gap-2 pt-1">{context.prompts.map((prompt) => <button type="button" key={prompt} disabled={pending} onClick={() => void requestAnswer(prompt)} className="rounded-full border border-red-200 bg-white px-3 py-2 text-left text-[11px] font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50">{prompt}</button>)}</div>}
          {!leadOpen && <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">{actionLinks.map((action) => <Link key={action.source} href={action.href} onClick={() => { trackAction(action.label, action.href); setOpen(false); }} className="rounded-full bg-white px-3 py-2 text-[11px] font-bold text-slate-700 shadow-sm hover:text-red-700">{action.label}</Link>)}</div>}
          {!leadOpen && location?.school_address && location.map_url && <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-700"><MapPin size={15} className="mt-0.5 shrink-0 text-red-600" /><div><p className="font-bold">Visit the school</p><p className="mt-1">{location.school_address}</p><a href={location.map_url} target="_blank" rel="noreferrer" onClick={() => trackAction("View location", location.map_url)} className="mt-1 inline-flex items-center gap-1 font-bold text-red-700">Open Google Maps <ArrowRight size={12} /></a></div></div>}
          <div ref={conversationEnd} />
        </div>
        {leadOpen ? <div className="border-t border-slate-200 bg-white p-4">
          {leadSent ? <div className="py-4 text-center"><CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" /><p className="mt-2 text-sm font-black text-slate-900">Enquiry received</p><p className="mt-1 text-xs text-slate-500">Our team will contact you shortly.</p><button type="button" onClick={() => { setLeadOpen(false); setLeadSent(false); setLead({ name: "", email: "", phone: "", enquiry: "" }); }} className="mt-4 text-xs font-bold text-red-700">Back to chat</button></div> : <form onSubmit={submitLead} className="space-y-2.5">
            <div className="mb-3 flex items-center gap-2"><UserRound size={16} className="text-red-600" /><p className="text-xs font-black text-slate-900">Connect with admissions</p></div>
            <input required maxLength={160} value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Your name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-red-400" />
            <input required type="email" maxLength={254} value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="Email address" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-red-400" />
            <input value={lead.phone} maxLength={80} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="Phone number (optional)" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-red-400" />
            <textarea required maxLength={1000} value={lead.enquiry} onChange={(e) => setLead({ ...lead, enquiry: e.target.value })} placeholder="How can we help?" rows={3} className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs outline-none focus:border-red-400" />
            <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-700 px-3 py-2.5 text-xs font-black text-white hover:bg-red-600 disabled:opacity-50">{pending ? "Sending..." : "Send enquiry"} <Send size={14} /></button>
          </form>}
        </div> : <div className="border-t border-slate-200 bg-white p-3">
          <form onSubmit={sendMessage} className="flex items-center gap-2"><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask me anything about the school..." maxLength={1000} className="min-w-0 flex-1 bg-transparent px-2 text-xs outline-none placeholder:text-slate-400" aria-label="Ask the school" /><button type="submit" disabled={pending || !input.trim()} className="rounded-xl bg-slate-900 p-2.5 text-white hover:bg-slate-700 disabled:opacity-50" aria-label="Send message"><Send size={14} /></button></form>
          <button type="button" onClick={() => { setLeadOpen(true); setServiceError(""); }} className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.12em] text-red-700">Talk to admissions <ArrowRight size={12} /></button>
        </div>}
      </section> : <button type="button" onClick={() => setOpen(true)} className="group flex items-center gap-3 rounded-full bg-red-700 px-4 py-3 text-white shadow-xl shadow-red-900/25 transition hover:-translate-y-0.5 hover:bg-red-600" aria-label="Open school assistant"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><MessageCircle size={20} /></span><span className="hidden text-left sm:block"><span className="block text-[10px] font-black uppercase tracking-[0.16em] text-red-100">Need help?</span><span className="block text-sm font-bold">Ask the school</span></span></button>}
    </div>
  </>;
}
