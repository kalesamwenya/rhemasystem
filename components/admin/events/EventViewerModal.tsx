'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Pencil, Search, Users, X } from 'lucide-react';
import type { AcademyEvent, EventRegistration } from '@/components/events/EventsContext';

type AttendanceStatus = NonNullable<EventRegistration['attendanceStatus']>;
type EventViewerTab = 'details' | 'registrations' | 'attendance';

interface EventViewerModalProps {
  event: AcademyEvent;
  registrations: EventRegistration[];
  loading: boolean;
  error: string;
  updatingAttendanceId: string | null;
  onClose: () => void;
  onEdit: () => void;
  onAttendanceChange: (registrationId: string, status: AttendanceStatus) => void;
}

const attendanceLabel: Record<AttendanceStatus, string> = {
  not_marked: 'Not checked in',
  present: 'Present',
  absent: 'Absent',
};

export default function EventViewerModal({
  event,
  registrations,
  loading,
  error,
  updatingAttendanceId,
  onClose,
  onEdit,
  onAttendanceChange,
}: EventViewerModalProps) {
  const [tab, setTab] = useState<EventViewerTab>('details');
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visibleRegistrations = useMemo(() => registrations.filter((registration) =>
    !query || `${registration.name} ${registration.email} ${registration.phone}`.toLowerCase().includes(query)
  ), [registrations, query]);
  const presentCount = registrations.filter((registration) => registration.attendanceStatus === 'present').length;
  const absentCount = registrations.filter((registration) => registration.attendanceStatus === 'absent').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="admin-event-viewer-title">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-200 bg-white p-5 sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Event management</p>
            <h2 id="admin-event-viewer-title" className="mt-2 text-2xl font-black text-slate-900">{event.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{event.theme}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 p-2 text-slate-600 hover:bg-slate-200" aria-label="Close event details"><X size={16} /></button>
        </div>

        <nav className="flex gap-2 border-b border-slate-200 px-5 sm:px-6" aria-label="Event details">
          {([
            ['details', 'Event details'],
            ['registrations', `Registrations (${registrations.length})`],
            ['attendance', `Attendance (${presentCount} present)`],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`border-b-2 px-3 py-3 text-xs font-black uppercase tracking-wide ${tab === value ? 'border-red-600 text-red-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="p-5 sm:p-6">
          {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
          {tab === 'details' ? (
            <div className="grid gap-6 md:grid-cols-[1.2fr_.8fr]">
              <div className="space-y-5">
                <div className="flex min-h-52 items-end rounded-xl bg-slate-900 bg-cover bg-center p-5" style={{ backgroundImage: event.image ? `linear-gradient(to top, rgba(15,23,42,.86), rgba(15,23,42,.15)), url('${event.image}')` : undefined }}>
                  <div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-900">{event.status}</span>
                    <p className="mt-4 max-w-xl text-sm font-semibold leading-6 text-white">{event.brief}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Description</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{event.description || 'No description added yet.'}</p>
                </div>
                {event.speakers.some((speaker) => speaker.name) && (
                  <section>
                    <h3 className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Featured speakers</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {event.speakers.filter((speaker) => speaker.name).map((speaker) => (
                        <article key={speaker.name} className="rounded-xl border border-slate-200 p-3">
                          <p className="font-bold text-slate-900">{speaker.name}</p>
                          <p className="mt-1 text-xs text-red-700">{speaker.role}</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">{speaker.bio}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                )}
              </div>
              <aside className="space-y-4 self-start rounded-xl border border-slate-200 bg-slate-50 p-5">
                <Detail label="Date and time" value={new Date(event.date).toLocaleString()} />
                {event.endDate && <Detail label="Ends" value={new Date(event.endDate).toLocaleString()} />}
                <Detail label="Location" value={event.location} />
                <Detail label="Entry fee" value={event.price ? `GHS ${event.price}` : 'Free'} />
                <Detail label="Registrations" value={loading ? 'Loading…' : String(registrations.length)} />
                <button type="button" onClick={() => setTab('registrations')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
                  <Users size={14} /> View registrations
                </button>
              </aside>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{tab === 'attendance' ? 'Event attendance' : 'Registered people'}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {tab === 'attendance'
                      ? `${presentCount} present · ${absentCount} absent · ${registrations.length - presentCount - absentCount} not checked in`
                      : 'Students and guests registered for this event.'}
                  </p>
                </div>
                <label className="relative block w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(input) => setSearch(input.target.value)} placeholder="Search name or contact" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-red-400 focus:bg-white" />
                </label>
              </div>

              {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-10 text-sm font-semibold text-slate-500"><Loader2 size={17} className="animate-spin" /> Loading event registrations…</div>
              ) : visibleRegistrations.length ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      <tr>
                        <th className="px-3 py-3">Registered person</th>
                        <th className="px-3 py-3">Contact</th>
                        <th className="px-3 py-3">Registration</th>
                        <th className="px-3 py-3">Payment</th>
                        {tab === 'attendance' && <th className="px-3 py-3">Attendance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRegistrations.map((registration) => {
                        const status = registration.attendanceStatus || 'not_marked';
                        const updating = updatingAttendanceId === registration.id;
                        return (
                          <tr key={registration.id} className="border-t border-slate-100">
                            <td className="px-3 py-3">
                              <p className="font-bold text-slate-900">{registration.name}</p>
                              <p className="text-xs text-slate-500">ID {registration.id}</p>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600">{registration.email || '—'}<br />{registration.phone || '—'}</td>
                            <td className="px-3 py-3 text-xs text-slate-600">
                              <span className="capitalize">{registration.registrationStatus || 'pending'}</span>
                              <p className="mt-1 text-[10px] text-slate-400">{registration.registeredAt ? new Date(registration.registeredAt).toLocaleString() : 'Date unavailable'}</p>
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${registration.paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{registration.paymentStatus || (registration.paid ? 'paid' : 'pending')}</span>
                              {registration.payment && <p className="mt-1">{registration.payment}</p>}
                            </td>
                            {tab === 'attendance' && (
                              <td className="min-w-44 px-3 py-3">
                                <label className="sr-only" htmlFor={`event-attendance-${registration.id}`}>Attendance status for {registration.name}</label>
                                <div className="flex items-center gap-2">
                                  {updating ? <Loader2 size={15} className="animate-spin text-slate-400" /> : status === 'present' ? <CheckCircle2 size={15} className="text-emerald-600" /> : null}
                                  <select
                                    id={`event-attendance-${registration.id}`}
                                    value={status}
                                    onChange={(change) => onAttendanceChange(registration.id, change.target.value as AttendanceStatus)}
                                    disabled={updating}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-60"
                                  >
                                    {Object.entries(attendanceLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                  </select>
                                </div>
                                {registration.attendanceMarkedAt && <p className="mt-1 text-[10px] text-slate-400">Marked {new Date(registration.attendanceMarkedAt).toLocaleString()}</p>}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  {registrations.length ? 'No registrations match your search.' : 'No registrations for this event yet.'}
                </p>
              )}
            </>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:px-6">
          {tab === 'details' && <button type="button" onClick={onEdit} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"><Pencil size={14} className="mr-1 inline" /> Edit event</button>}
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">Close</button>
        </footer>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>;
}
