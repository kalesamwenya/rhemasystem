'use client';

import { useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, Eye, Pencil, Plus, Search, Trash2, Upload, Users, X } from 'lucide-react';
import { useEvents, type AcademyEvent, type EventRegistration, type EventSpeaker } from '@/components/events/EventsContext';
import EventViewerModal from '@/components/admin/events/EventViewerModal';
import { api, assetUrl } from '@/lib/api';

const menuOptions = ['Standard', 'Vegetarian', 'Vegan', 'Halal', 'Gluten-free', 'Dairy-free'];
const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-red-400 focus:bg-white';
const blankSpeaker = (): EventSpeaker => ({ name: '', role: '', bio: '', avatar: '' });
const blankEvent = (): Omit<AcademyEvent, 'id' | 'registrations'> => ({ title: '', theme: '', brief: '', description: '', date: '', endDate: '', location: '', price: 0, image: '', status: 'Draft', speakers: [blankSpeaker()], diets: ['Standard', 'Vegetarian'] });

type AttendanceStatus = NonNullable<EventRegistration['attendanceStatus']>;

function normalizeEventRegistration(value: unknown): EventRegistration {
  if (!value || typeof value !== 'object') throw new Error('An event registration record was invalid.');
  const registration = value as Record<string, unknown>;
  if (typeof registration.id !== 'number' && typeof registration.id !== 'string') {
    throw new Error('An event registration record is missing its ID.');
  }
  const attendanceStatus = ['present', 'absent', 'not_marked'].includes(String(registration.attendance_status))
    ? registration.attendance_status as AttendanceStatus
    : 'not_marked';
  return {
    id: String(registration.id),
    name: typeof registration.guest_name === 'string' && registration.guest_name.trim() ? registration.guest_name : 'Registered guest',
    email: typeof registration.guest_email === 'string' ? registration.guest_email : '',
    phone: typeof registration.guest_phone === 'string' ? registration.guest_phone : '',
    diet: 'Standard',
    payment: typeof registration.payment_method === 'string' ? registration.payment_method : '',
    paid: registration.payment_status === 'paid',
    registeredAt: typeof registration.created_at === 'string' ? registration.created_at : '',
    attendanceStatus,
    attendanceMarkedAt: typeof registration.attendance_marked_at === 'string' ? registration.attendance_marked_at : null,
    registrationStatus: typeof registration.registration_status === 'string' ? registration.registration_status : 'pending',
    paymentStatus: typeof registration.payment_status === 'string' ? registration.payment_status : 'pending',
  };
}

export default function AdminEventsPage() {
  const { events, createEvent, updateEvent, deleteEvent, updateRegistrationAttendance } = useEvents();
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'events' | 'registrations'>('events');
  const [selectedId, setSelectedId] = useState(events[0]?.id ?? '');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerRegistrations, setViewerRegistrations] = useState<EventRegistration[]>([]);
  const [viewerRegistrationsLoading, setViewerRegistrationsLoading] = useState(false);
  const [viewerError, setViewerError] = useState('');
  const [updatingAttendanceId, setUpdatingAttendanceId] = useState<string | null>(null);
  const registrationsRequestId = useRef(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AcademyEvent | null>(null);
  const [draft, setDraft] = useState(blankEvent());

  const selectedEvent = events.find((event) => event.id === selectedId) ?? events[0];
  const filteredEvents = useMemo(() => events.filter((event) => `${event.title} ${event.theme} ${event.location}`.toLowerCase().includes(search.toLowerCase())), [events, search]);
  const openEventViewer = (event: AcademyEvent) => {
    const requestId = registrationsRequestId.current + 1;
    registrationsRequestId.current = requestId;
    setSelectedId(event.id);
    setViewerRegistrations([]);
    setViewerError('');
    setViewerOpen(true);
    setViewerRegistrationsLoading(true);
    api.registrations.list(event.id)
      .then((response: unknown) => {
        if (!response || typeof response !== 'object'
          || (response as { success?: unknown }).success !== true
          || !Array.isArray((response as { data?: unknown }).data)) {
          throw new Error('The event registration response was invalid.');
        }
        const registrations = (response as { data: unknown[] }).data
          .map(normalizeEventRegistration);
        if (registrationsRequestId.current === requestId) setViewerRegistrations(registrations);
      })
      .catch((error: unknown) => {
        if (registrationsRequestId.current === requestId) {
          setViewerError(error instanceof Error ? error.message : 'Unable to load event registrations.');
        }
      })
      .finally(() => {
        if (registrationsRequestId.current === requestId) setViewerRegistrationsLoading(false);
      });
  };
  const closeEventViewer = () => {
    registrationsRequestId.current += 1;
    setViewerOpen(false);
    setViewerRegistrationsLoading(false);
  };
  const updateAttendance = async (registrationId: string, attendanceStatus: AttendanceStatus) => {
    setUpdatingAttendanceId(registrationId);
    setViewerError('');
    try {
      await api.registrations.updateAttendance(registrationId, attendanceStatus);
      setViewerRegistrations((current) => current.map((registration) => registration.id === registrationId
        ? { ...registration, attendanceStatus, attendanceMarkedAt: attendanceStatus === 'not_marked' ? null : new Date().toISOString() }
        : registration));
      if (selectedEvent) updateRegistrationAttendance(selectedEvent.id, registrationId, attendanceStatus);
    } catch (error) {
      setViewerError(error instanceof Error ? error.message : 'Unable to update attendee attendance.');
    } finally {
      setUpdatingAttendanceId(null);
    }
  };
  const openCreate = () => { setEditing(null); setDraft(blankEvent()); setEditorOpen(true); };
  const openEdit = (event: AcademyEvent) => { setEditing(event); setDraft({ ...event, speakers: event.speakers.length ? event.speakers : [blankSpeaker()] }); setEditorOpen(true); };
  const updateDraft = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateSpeaker = (index: number, value: Partial<EventSpeaker>) => updateDraft('speakers', draft.speakers.map((speaker, speakerIndex) => speakerIndex === index ? { ...speaker, ...value } : speaker));
  const readImage = (file: File | undefined, onDone: (value: string) => void) => { if (!file) return; api.uploads.image(file, 'events').then((body: { data?: { path?: string } }) => onDone(assetUrl(body.data?.path || ''))).catch(() => undefined); };
  const saveEvent = (event: React.FormEvent) => { event.preventDefault(); if (!draft.title.trim() || !draft.theme.trim() || !draft.date || !draft.location.trim()) return; if (editing) updateEvent({ ...editing, ...draft }); else createEvent(draft); setEditorOpen(false); };
  const removeEvent = (event: AcademyEvent) => { if (!window.confirm(`Delete ${event.title}?`)) return; deleteEvent(event.id); if (selectedId === event.id) setSelectedId(events.find((item) => item.id !== event.id)?.id ?? ''); };

  return <div className="space-y-6">
    <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Community</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Events Management</h1><p className="mt-1 text-sm text-slate-500">Create events, publish details, and manage attendee registrations.</p></div><button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] text-white"><Plus size={15} /> Create event</button></header>
    <div className="flex gap-2 border-b border-slate-200"><button onClick={() => setTab('events')} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-black uppercase tracking-[0.15em] ${tab === 'events' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-400'}`}><CalendarDays size={15} /> Events</button><button onClick={() => setTab('registrations')} className={`inline-flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-black uppercase tracking-[0.15em] ${tab === 'registrations' ? 'border-red-600 text-red-700' : 'border-transparent text-slate-400'}`}><Users size={15} /> Registered students and guests</button></div>
    {tab === 'events' ? <><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search events, themes, or locations" className={`${inputClass} pl-9`} /></div><div className="grid gap-4 lg:grid-cols-2">{filteredEvents.map((event) => <article key={event.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex h-40 items-end bg-slate-900 bg-cover bg-center p-4" style={{ backgroundImage: event.image ? `linear-gradient(to top, rgba(15,23,42,.9), transparent), url('${event.image}')` : undefined }}><div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${event.status === 'Published' ? 'bg-emerald-400 text-emerald-950' : 'bg-amber-300 text-amber-950'}`}>{event.status}</span><h2 className="mt-2 text-xl font-black text-white">{event.title}</h2></div></div><div className="space-y-3 p-5"><p className="text-sm font-semibold text-slate-700">{event.theme}</p><p className="text-xs leading-5 text-slate-500">{event.brief}</p><div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2"><span><b>Date:</b> {new Date(event.date).toLocaleString()}</span><span><b>Location:</b> {event.location}</span><span><b>Registrations:</b> {event.registrations.length}</span><span><b>Fee:</b> {event.price ? `GHS ${event.price}` : 'Free'}</span></div><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">    <button type="button" onClick={() => openEventViewer(event)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Eye size={14} /> View in admin</button><button onClick={() => openEdit(event)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={14} /> Edit</button><button onClick={() => removeEvent(event)} className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><Trash2 size={14} /> Delete</button></div></div></article>)}</div></> : <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex flex-wrap items-center gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Attendee directory</p><h2 className="mt-1 text-xl font-black text-slate-900">Registered students and public guests</h2></div><select value={selectedEvent?.id ?? ''} onChange={(event) => setSelectedId(event.target.value)} className="ml-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700">{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></div>{selectedEvent?.registrations.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500"><tr><th className="px-3 py-3">Name</th><th className="px-3 py-3">Contact</th><th className="px-3 py-3">Food menu</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3">Status</th></tr></thead><tbody>{selectedEvent.registrations.map((registration) => <tr key={registration.id} className="border-t border-slate-100"><td className="px-3 py-3 font-bold text-slate-900">{registration.name}</td><td className="px-3 py-3 text-xs text-slate-600">{registration.email}<br />{registration.phone}</td><td className="px-3 py-3 text-xs text-slate-600">{registration.diet}</td><td className="px-3 py-3 text-xs text-slate-600">{registration.payment}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">{registration.paid ? 'Paid' : 'Pending'}</span></td></tr>)}</tbody></table></div> : <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No registrations for this event yet.</p>}</div>}

    {editorOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"><form onSubmit={saveEvent} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Event editor</p><h2 className="mt-1 text-2xl font-black text-slate-900">{editing ? 'Update event' : 'Create event'}</h2></div><button type="button" onClick={() => setEditorOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600" aria-label="Close event editor"><X size={16} /></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Event title"><input required value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} className={inputClass} /></Field><Field label="Theme"><input required value={draft.theme} onChange={(e) => updateDraft('theme', e.target.value)} className={inputClass} /></Field><Field label="Brief"><input required value={draft.brief} onChange={(e) => updateDraft('brief', e.target.value)} className={inputClass} /></Field><Field label="Location"><input required value={draft.location} onChange={(e) => updateDraft('location', e.target.value)} className={inputClass} /></Field><Field label="Start date and time"><input required type="datetime-local" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)} className={inputClass} /></Field><Field label="End date and time"><input type="datetime-local" value={draft.endDate} onChange={(e) => updateDraft('endDate', e.target.value)} className={inputClass} /></Field><Field label="Entry fee (GHS)"><input type="number" min="0" value={draft.price} onChange={(e) => updateDraft('price', Number(e.target.value))} className={inputClass} /></Field><Field label="Publish status"><select value={draft.status} onChange={(e) => updateDraft('status', e.target.value as AcademyEvent['status'])} className={inputClass}><option>Draft</option><option>Published</option></select></Field><Field label="Description"><textarea required value={draft.description} onChange={(e) => updateDraft('description', e.target.value)} className={`${inputClass} min-h-28`} /></Field><Field label="Cover image"><input type="file" accept="image/*" onChange={(e) => readImage(e.target.files?.[0], (value) => updateDraft('image', value))} className={inputClass} />{draft.image && <img src={draft.image} alt="Event cover preview" className="mt-2 h-24 w-full rounded-xl object-cover" />}<span className="mt-1 block text-[10px] text-slate-500"><Upload size={12} className="mr-1 inline" /> Upload a cover image</span></Field></div>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900">Food menu options</h3><p className="mt-1 text-xs text-slate-500">These options appear as a checklist only after payment succeeds.</p></div></div><div className="mt-3 flex flex-wrap gap-2">{menuOptions.map((menu) => <label key={menu} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={draft.diets.includes(menu)} onChange={(e) => updateDraft('diets', e.target.checked ? [...draft.diets, menu] : draft.diets.filter((item) => item !== menu))} className="h-4 w-4 accent-red-600" />{menu}</label>)}</div></div>
      <div className="mt-6 flex items-center justify-between"><h3 className="font-black text-slate-900">Key speakers</h3><button type="button" onClick={() => updateDraft('speakers', [...draft.speakers, blankSpeaker()])} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold"><Plus size={14} /> Add speaker</button></div><div className="mt-3 space-y-3">{draft.speakers.map((speaker, index) => <div key={index} className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4"><input placeholder="Speaker name" value={speaker.name} onChange={(e) => updateSpeaker(index, { name: e.target.value })} className={inputClass} /><input placeholder="Role" value={speaker.role} onChange={(e) => updateSpeaker(index, { role: e.target.value })} className={inputClass} /><input placeholder="Short bio" value={speaker.bio} onChange={(e) => updateSpeaker(index, { bio: e.target.value })} className={inputClass} /><label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><Upload size={14} /> {speaker.avatar ? 'Replace avatar' : 'Upload avatar'}<input type="file" accept="image/*" className="sr-only" onChange={(e) => readImage(e.target.files?.[0], (value) => updateSpeaker(index, { avatar: value }))} /></label>{speaker.avatar && <img src={speaker.avatar} alt={`${speaker.name || 'Speaker'} avatar preview`} className="h-14 w-14 rounded-full object-cover" />}</div>)}</div><div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700">Cancel</button><button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white"><Check size={14} /> Save event</button></div></form></div>}
    {viewerOpen && selectedEvent && <EventViewerModal
      event={selectedEvent}
      registrations={viewerRegistrations}
      loading={viewerRegistrationsLoading}
      error={viewerError}
      updatingAttendanceId={updatingAttendanceId}
      onClose={closeEventViewer}
      onEdit={() => { closeEventViewer(); openEdit(selectedEvent); }}
      onAttendanceChange={(registrationId, status) => void updateAttendance(registrationId, status)}
    />}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-bold text-slate-600">{label}<span className="mt-1 block">{children}</span></label>; }
