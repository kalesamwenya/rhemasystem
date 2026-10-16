'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, CalendarDays, Check, CheckCircle2, MapPin, ShieldCheck, Ticket, Users, X } from 'lucide-react';
import { useEvents } from '@/components/events/EventsContext';

const paymentOptions = ['Mobile money', 'Visa', 'Bank transfer'];
const pad = (value: number) => String(value).padStart(2, '0');
const fieldClass = 'mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-red-400 focus:bg-white';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { events, eventsLoaded, registerForEvent } = useEvents();
  const event = events.find((item) => item.id === id);
  const [now, setNow] = useState(() => Date.now());
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', payment: paymentOptions[0] });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const countdown = useMemo(() => {
    if (!event) return null;
    const eventTime = new Date(event.date).getTime();
    if (!Number.isFinite(eventTime) || eventTime <= now) return null;
    const distance = eventTime - now;
    return [Math.floor(distance / 86400000), Math.floor(distance / 3600000) % 24, Math.floor(distance / 60000) % 60, Math.floor(distance / 1000) % 60];
  }, [event, now]);
  const eventEndTime = event?.endDate ? new Date(event.endDate).getTime() : event ? new Date(event.date).getTime() : Number.NaN;
  const eventStartTime = event ? new Date(event.date).getTime() : Number.NaN;
  const eventStatus = !Number.isFinite(eventStartTime)
    ? "Event date to be announced"
    : Number.isFinite(eventEndTime) && eventEndTime >= now
      ? "This event is underway"
      : "This event has concluded";
  const eventHasEnded = Number.isFinite(eventEndTime) && eventEndTime < now;
  const eventDateLabel = event && Number.isFinite(new Date(event.date).getTime())
    ? new Date(event.date).toLocaleString("en-ZM", { dateStyle: "full", timeStyle: "short" })
    : "Date to be announced";

  if (!event && !eventsLoaded) return <main role="status" className="mx-auto max-w-3xl px-4 py-24 text-center text-sm font-medium text-slate-600">Loading event details...</main>;
  if (!event) return <main className="mx-auto max-w-3xl px-4 py-24 text-center"><h1 className="text-3xl font-black text-slate-900">Event not found</h1><Link href="/events" className="mt-6 inline-flex rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white">Back to events</Link></main>;

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (submission: FormEvent) => {
    submission.preventDefault();
    if (!paymentSuccessful) {
      if (!form.name || !form.email || !form.phone) return;
      setPaymentSuccessful(true);
      return;
    }
    if (event.diets.length > 0 && !selectedDiets.length) return;
    await registerForEvent(event.id, { ...form, diet: selectedDiets.join(', '), paid: true });
    setSubmitted(true);
  };

  return <div className="bg-white">
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      <img src={event.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 sm:pb-14 lg:px-8 lg:pb-20 lg:pt-32">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"><ArrowLeft size={16} /> Back to events</Link>
        <div className="mt-10 max-w-3xl sm:mt-12"><p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">{event.theme}</p><h1 className="mt-4 text-4xl font-black leading-tight tracking-tight md:text-6xl">{event.title}</h1><p className="mt-4 max-w-2xl text-lg leading-8 text-slate-200">{event.brief}</p></div>
        {countdown ? (
          <div aria-label="Time until the event starts" className="mt-9 grid max-w-xl grid-cols-4 gap-2 sm:gap-3">
            {['Days', 'Hours', 'Minutes', 'Seconds'].map((label, index) => <div key={label} className="border-l border-white/30 pl-3 sm:pl-4"><p className="text-2xl font-black sm:text-3xl">{pad(countdown[index])}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">{label}</p></div>)}
          </div>
        ) : (
          <p className="mt-9 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-bold text-white">{eventStatus}</p>
        )}
      </div>
    </section>

    <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
      <div className="grid gap-3 border-y border-slate-200 py-5 sm:grid-cols-3"><Fact icon={<CalendarDays size={17} />} label="Date and time" value={eventDateLabel} /><Fact icon={<MapPin size={17} />} label="Location" value={event.location || "Location to be announced"} /><Fact icon={<Ticket size={17} />} label="Entry" value={event.price ? `ZMW ${event.price}` : 'Free'} /></div>
      <section className="mt-16 max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">About this event</p><h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{event.theme || event.title}</h2><p className="mt-5 whitespace-pre-line text-base leading-8 text-slate-600">{event.description || event.brief}</p></section>
      {event.speakers.some((speaker) => speaker.name) && <section className="mt-20"><div className="flex items-end justify-between border-b border-slate-200 pb-5"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">Featured voices</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Meet the speakers</h2></div><span className="text-sm text-slate-400">{event.speakers.filter((speaker) => speaker.name).length} voices</span></div><div className="mt-7 grid gap-6 md:grid-cols-2">{event.speakers.filter((speaker) => speaker.name).map((speaker) => <article key={speaker.name} className="flex gap-5 border-b border-slate-200 pb-6"><div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-red-100 ring-4 ring-red-50">{speaker.avatar ? <img src={speaker.avatar} alt={speaker.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl font-black text-red-700">{speaker.name.charAt(0)}</div>}</div><div><h3 className="text-lg font-black text-slate-950">{speaker.name}</h3><p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-red-700">{speaker.role}</p><p className="mt-3 text-sm leading-6 text-slate-600">{speaker.bio}</p></div></article>)}</div></section>}
      <section className="mt-20 flex flex-col gap-6 border-t border-slate-200 pt-10 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">{eventHasEnded ? "Event update" : "Join us"}</p><h2 className="mt-2 text-3xl font-black text-slate-950">{eventHasEnded ? "This event has ended." : "Save your place today."}</h2><p className="mt-2 text-sm text-slate-600">{eventHasEnded ? "Registration is closed for this event." : "Payment is completed securely before we collect your menu preference."}</p></div>{eventHasEnded ? null : submitted ? <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} /> Registration confirmed</div> : <button type="button" onClick={() => setRegistrationOpen(true)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500"><Users size={17} /> Register for this event</button>}</section>
      {!eventHasEnded && <section className="mt-16 border-t border-slate-200 pt-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><ShieldCheck size={21} /></div><p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-red-600">Secure payment options</p><h2 className="mt-2 text-2xl font-black text-slate-950">Pay securely, your way</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">Registration payments are handled through trusted mobile money and card providers.</p><div className="mt-6 flex flex-wrap items-center justify-center gap-3">{[{ name: 'Airtel Money', mark: 'A', className: 'bg-red-600 text-white' }, { name: 'MTN Mobile Money', mark: 'MTN', className: 'bg-yellow-400 text-slate-950' }, { name: 'Zamtel', mark: 'Z', className: 'bg-emerald-600 text-white' }, { name: 'Visa', mark: 'VISA', className: 'bg-blue-900 text-white' }].map((method) => <div key={method.name} className="inline-flex min-w-[9.5rem] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left shadow-sm"><span className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-[10px] font-black tracking-tight ${method.className}`}>{method.mark}</span><span className="text-sm font-bold text-slate-800">{method.name}</span></div>)}</div></section>}
    </main>

    {registrationOpen && <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"><div className="mx-auto my-8 w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Registration</p><h2 className="mt-2 text-2xl font-black text-slate-950">{paymentSuccessful ? event.diets.length > 0 ? 'Choose your menu' : 'Confirm registration' : 'Reserve your place'}</h2></div><button type="button" onClick={() => setRegistrationOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Close registration"><X size={17} /></button></div><form onSubmit={submit} className="mt-6 space-y-4">{!paymentSuccessful ? <><Field label="Full name"><input required className={fieldClass} value={form.name} onChange={(e) => update('name', e.target.value)} /></Field><Field label="Email"><input required type="email" className={fieldClass} value={form.email} onChange={(e) => update('email', e.target.value)} /></Field><Field label="Phone"><input required className={fieldClass} value={form.phone} onChange={(e) => update('phone', e.target.value)} /></Field><Field label="Payment method"><select className={fieldClass} value={form.payment} onChange={(e) => update('payment', e.target.value)}>{paymentOptions.map((option) => <option key={option}>{option}</option>)}</select></Field><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><span>Registration fee</span><b className="text-slate-950">{event.price ? `ZMW ${event.price}` : 'Free'}</b></div><button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3.5 text-sm font-semibold text-white"><ShieldCheck size={17} /> Pay and continue</button></> : <><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-black text-emerald-800"><CheckCircle2 size={17} /> Payment successful</div><p className="mt-1 text-xs leading-5 text-emerald-800/80">{event.diets.length > 0 ? 'Select one or more food options for the event menu.' : 'No menu preferences are required for this event.'}</p></div>{event.diets.length > 0 && <div className="space-y-2">{event.diets.map((diet) => <label key={diet} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 hover:border-red-300"><input type="checkbox" checked={selectedDiets.includes(diet)} onChange={(e) => setSelectedDiets((current) => e.target.checked ? [...current, diet] : current.filter((item) => item !== diet))} className="h-4 w-4 accent-red-600" />{diet}<Check className={`ml-auto h-4 w-4 ${selectedDiets.includes(diet) ? 'text-red-600' : 'text-transparent'}`} /></label>)}</div>}<button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-3.5 text-sm font-semibold text-white"><CheckCircle2 size={17} /> Confirm registration</button></>}</form></div></div>}
  </div>;
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) { return <div className="flex gap-3"><div className="mt-0.5 text-red-600">{icon}</div><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold leading-5 text-slate-800">{value}</p></div></div>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block text-xs font-bold text-slate-700">{label}{children}</label>; }
