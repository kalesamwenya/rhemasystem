"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/api";

export type EventSpeaker = { name: string; role: string; bio: string; avatar?: string };
export type EventRegistration = {
  id: string;
  name: string;
  email: string;
  phone: string;
  diet: string;
  payment: string;
  paid: boolean;
  registeredAt: string;
  attendanceStatus?: 'not_marked' | 'present' | 'absent';
  attendanceMarkedAt?: string | null;
  registrationStatus?: string;
  paymentStatus?: string;
};
export type AcademyEvent = {
  id: string;
  title: string;
  theme: string;
  brief: string;
  description: string;
  date: string;
  endDate: string;
  location: string;
  price: number;
  image: string;
  status: "Published" | "Draft";
  speakers: EventSpeaker[];
  diets: string[];
  registrations: EventRegistration[];
};

const initialEvents: AcademyEvent[] = [
  {
    id: "future-ready-2026",
    title: "Future Ready: Skills for a Changing World",
    theme: "Innovation, resilience, and responsible leadership",
    brief: "A practical gathering for learners, families, and leaders shaping the next generation.",
    description: "Spend an inspiring day with educators, entrepreneurs, and student innovators exploring the skills that matter beyond the classroom. The programme includes a keynote, panel conversations, student showcases, and a networking lunch.",
    date: "2026-10-24T09:00:00",
    endDate: "2026-10-24T16:30:00",
    location: "Godfrey Academy Innovation Hall, Accra",
    price: 120,
    image: "https://images.pexels.com/photos/2774556/pexels-photo-2774556.jpeg?auto=compress&cs=tinysrgb&w=1600",
    status: "Published",
    speakers: [
      { name: "Dr. Ama Mensah", role: "Education & Innovation Strategist", bio: "A learning designer helping schools build confident, future-facing communities.", avatar: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=200" },
      { name: "Kwame Owusu", role: "Technology Founder", bio: "A founder and mentor focused on practical technology for African communities.", avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200" },
    ],
    diets: ["Standard", "Vegetarian", "Vegan", "Halal", "Gluten-free"],
    registrations: [
      { id: "REG-1001", name: "Martha Asante", email: "martha@example.com", phone: "+233 20 111 2233", diet: "Vegetarian", payment: "Mobile money", paid: true, registeredAt: "2026-08-28" },
      { id: "REG-1002", name: "Daniel Kofi", email: "daniel@example.com", phone: "+233 24 222 3344", diet: "Standard", payment: "Visa", paid: true, registeredAt: "2026-08-30" },
    ],
  },
  {
    id: "family-learning-day-2026",
    title: "Family Learning Day",
    theme: "Learning together, growing together",
    brief: "An open campus day with workshops, school tours, and conversations for families.",
    description: "Meet our teaching team, explore student projects, and join practical workshops designed to help families support learning at home.",
    date: "2026-11-14T10:00:00",
    endDate: "2026-11-14T15:00:00",
    location: "Godfrey Academy Main Campus",
    price: 0,
    image: "https://images.pexels.com/photos/8613312/pexels-photo-8613312.jpeg?auto=compress&cs=tinysrgb&w=1600",
    status: "Published",
    speakers: [{ name: "Mrs. Abena Boateng", role: "Head of Primary", bio: "A patient educator who creates joyful, confident learners.", avatar: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=200" }],
    diets: ["Standard", "Vegetarian", "Vegan"],
    registrations: [],
  },
];

type EventContextValue = {
  events: AcademyEvent[];
  eventsLoaded: boolean;
  createEvent: (event: Omit<AcademyEvent, "id" | "registrations">) => void;
  updateEvent: (event: AcademyEvent) => void;
  deleteEvent: (id: string) => void;
  updateRegistrationAttendance: (eventId: string, registrationId: string, attendanceStatus: NonNullable<EventRegistration['attendanceStatus']>) => void;
  registerForEvent: (id: string, registration: Omit<EventRegistration, "id" | "registeredAt">) => Promise<void>;
};

const EventsContext = createContext<EventContextValue | null>(null);

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error("useEvents must be used inside EventsProvider");
  return context;
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AcademyEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  useEffect(() => {
    api.events.list().then(async (body: { data?: Array<{ id: number; title: string; theme: string; brief: string; description: string; starts_at: string; ends_at?: string; location: string; image?: string; fee?: number; status: string; speakers?: Array<{ id: number; name: string; role: string; bio?: string; avatar?: string }> }> }) => {
      const loaded = await Promise.all((body.data || []).map(async (event) => {
        const registrationsBody = window.location.pathname.startsWith('/admin')
          ? await api.registrations.list(event.id).catch(() => ({ data: [] }))
          : { data: [] };
        const registrations = ((registrationsBody as { data?: Array<{ id: number; guest_name?: string; guest_email?: string; guest_phone?: string; payment_method?: string; payment_status?: string; attendance_status?: EventRegistration['attendanceStatus']; created_at?: string }> }).data || []).map((registration) => ({ id: String(registration.id), name: registration.guest_name || 'Student', email: registration.guest_email || '', phone: registration.guest_phone || '', diet: 'Standard', payment: registration.payment_method || '', paid: registration.payment_status === 'paid', registeredAt: registration.created_at || '', attendanceStatus: registration.attendance_status || 'not_marked' }));
        const speakers = (event.speakers || []).map((speaker) => ({ name: speaker.name, role: speaker.role, bio: speaker.bio || '', avatar: assetUrl(speaker.avatar || '') }));
        return { id: String(event.id), title: event.title, theme: event.theme, brief: event.brief, description: event.description, date: event.starts_at, endDate: event.ends_at || '', location: event.location, price: Number(event.fee || 0), image: assetUrl(event.image || ''), status: event.status === 'published' ? 'Published' as const : 'Draft' as const, speakers, diets: [], registrations };
      }));
      setEvents(loaded);
    }).catch(() => setEvents([])).finally(() => setEventsLoaded(true));
  }, []);
  const eventPayload = (event: Omit<AcademyEvent, "id" | "registrations"> & { id?: string }) => ({ ...(event.id && { id: Number(event.id) }), title: event.title, theme: event.theme, brief: event.brief, description: event.description, starts_at: event.date, ends_at: event.endDate || null, location: event.location, image: event.image?.replace(`${api.baseUrl}/`, '') || '', fee: event.price, currency: 'GHS', status: event.status.toLowerCase(), speakers: event.speakers.map((speaker) => ({ ...speaker, avatar: speaker.avatar?.replace(`${api.baseUrl}/`, '') || '' })) });
  const createEvent = async (event: Omit<AcademyEvent, "id" | "registrations">) => { const response = await api.events.save(eventPayload(event)) as { data?: { id?: number | string } }; const id = String(response.data?.id || Date.now()); setEvents((current) => [...current, { ...event, id, image: assetUrl(event.image), registrations: [] }]); };
  const updateEvent = async (event: AcademyEvent) => { await api.events.save(eventPayload(event)); setEvents((current) => current.map((item) => item.id === event.id ? { ...event, image: assetUrl(event.image) } : item)); };
  const deleteEvent = async (id: string) => { await api.events.remove(id); setEvents((current) => current.filter((event) => event.id !== id)); };
  const updateRegistrationAttendance = (eventId: string, registrationId: string, attendanceStatus: NonNullable<EventRegistration['attendanceStatus']>) => {
    setEvents((current) => current.map((event) => event.id === eventId
      ? { ...event, registrations: event.registrations.map((registration) => registration.id === registrationId ? { ...registration, attendanceStatus } : registration) }
      : event));
  };
  const registerForEvent = async (id: string, registration: Omit<EventRegistration, "id" | "registeredAt">) => {
    const response = await api.registrations.save({ event_id: Number(id), guest_name: registration.name, guest_email: registration.email, guest_phone: registration.phone, payment_method: registration.payment, payment_status: registration.paid ? 'paid' : 'pending', registration_status: 'confirmed' }) as { data?: { id?: number | string } };
    const registrationId = String(response.data?.id || Date.now());
    setEvents((current) => current.map((event) => event.id === id ? { ...event, registrations: [...event.registrations, { ...registration, id: registrationId, registeredAt: new Date().toISOString().slice(0, 10), attendanceStatus: 'not_marked' }] } : event));
  };
  const value = { events, eventsLoaded, createEvent, updateEvent, deleteEvent, updateRegistrationAttendance, registerForEvent };
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
