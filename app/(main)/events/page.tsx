"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import { useEvents } from "@/components/events/EventsContext";

export default function EventsPage() {
  const { events } = useEvents();
  const publishedEvents = events
    .filter((event) => event.status === "Published")
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  return (
    <div className="bg-white">
      <section className="bg-[#f4f5f4] px-4 pb-12 pt-32 sm:px-6 sm:pb-14 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-semibold text-slate-500"><Link href="/" className="hover:text-blue-800">Home</Link><span className="mx-2">/</span>Events</p>
          <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Rhema Zambia</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-[1.04] tracking-tight text-[#10283a] sm:text-6xl">Events and gatherings</h1>
          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-slate-700">Find upcoming events, gatherings and opportunities to connect with Rhema Zambia.</p>
        </div>
      </section>

      <section className="bg-[#f4f5f4] py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-800">Gather together</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[#10283a] sm:text-4xl">Upcoming events</h2>
              <p className="mt-2 text-sm text-slate-600">Connect with Rhema Zambia at upcoming gatherings.</p>
            </div>
            <span className="text-sm font-semibold text-slate-500">{publishedEvents.length} event{publishedEvents.length === 1 ? "" : "s"}</span>
          </div>
          {publishedEvents.length === 0 ? (
            <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-7">
              <h3 className="text-lg font-black text-[#10283a]">No events are currently scheduled.</h3>
              <p className="mt-2 text-sm text-slate-600">Please check back soon or contact the school office for event updates.</p>
              <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-800 hover:underline">Contact the school <ArrowRight size={15} /></Link>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {publishedEvents.map((event) => (
                <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  <Link href={`/events/${event.id}`} className="block">
                    <div className="relative h-52 overflow-hidden bg-[#10283a]">
                      <img src={event.image} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                      <span className="absolute bottom-4 left-4 inline-flex items-center gap-2 text-sm font-bold text-white"><CalendarDays size={15} />{new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                    <div className="p-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-800">{event.theme}</p>
                      <h3 className="mt-2 text-xl font-black leading-tight text-[#10283a]">{event.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{event.brief}</p>
                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1.5"><MapPin size={14} />{event.location}</span>
                        <span className="inline-flex items-center gap-1.5"><Ticket size={14} />{event.price ? `ZMW ${event.price}` : "Free entry"}</span>
                        <span className="inline-flex items-center gap-1.5"><Users size={14} />{event.speakers.filter((speaker) => speaker.name).length} speakers</span>
                      </div>
                      <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-800">Event details <ArrowRight size={15} /></span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
