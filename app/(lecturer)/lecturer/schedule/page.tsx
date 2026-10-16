'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Users } from 'lucide-react';
import { api } from '@/lib/api';

type TeachingSession = {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  notes: string;
  course_id: string;
  course_name: string;
  cohort_name: string;
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function LecturerSchedulePage() {
  const today = new Date();
  const todayKey = dateKey(today);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (api.courses.lecturerSchedule() as Promise<{ data?: TeachingSession[] }>)
      .then((response) => {
        if (active) setSessions(response.data ?? []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load your teaching timetable.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const sessionsByDate = useMemo(() => {
    const grouped = new Map<string, TeachingSession[]>();
    sessions.forEach((session) => {
      const key = session.session_date.slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), session]);
    });
    return grouped;
  }, [sessions]);

  const calendarDates = useMemo(() => {
    const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
    const leadingDays = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
    const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
    return Array.from({ length: cellCount }, (_, index) => (
      new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), index - leadingDays + 1)
    ));
  }, [visibleMonth]);

  const selectedSessions = sessionsByDate.get(selectedDate) ?? [];
  const moveMonth = (amount: number) => {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + amount, 1);
    setVisibleMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  };
  const goToToday = () => {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  };

  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-900">Teaching calendar</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">My schedule</h1>
        <p className="mt-1 text-sm text-slate-500">Calendar of sessions for courses assigned to you.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section aria-label="Monthly teaching calendar" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-blue-900" />
            <h2 className="text-lg font-black text-slate-900">
              {visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={goToToday} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50">
              Today
            </button>
            <button type="button" aria-label="Previous month" onClick={() => moveMonth(-1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Next month" onClick={() => moveMonth(1)} className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[630px]">
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
              {weekDays.map((day) => (
                <div key={day} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-xs">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDates.map((date) => {
                const key = dateKey(date);
                const dateSessions = sessionsByDate.get(key) ?? [];
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
                const isSelected = key === selectedDate;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDate(key)}
                    aria-pressed={isSelected}
                    aria-label={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${dateSessions.length ? `, ${dateSessions.length} session${dateSessions.length === 1 ? '' : 's'}` : ''}`}
                    className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left transition hover:bg-blue-50/60 sm:min-h-28 sm:p-2 ${
                      isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-800' : 'bg-white'
                    } ${isCurrentMonth ? '' : 'text-slate-300'}`}
                  >
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isToday ? 'bg-slate-900 text-white' : isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                    }`}>
                      {date.getDate()}
                    </span>
                    <div className="mt-1 space-y-1">
                      {dateSessions.slice(0, 2).map((session) => (
                        <span key={session.id} className="block truncate rounded bg-blue-100 px-1.5 py-1 text-[9px] font-bold text-blue-900 sm:text-[10px]">
                          <span className="hidden sm:inline">{session.start_time.slice(0, 5)} </span>{session.course_name}
                        </span>
                      ))}
                      {dateSessions.length > 2 && (
                        <span className="block px-1 text-[9px] font-semibold text-slate-500">+{dateSessions.length - 2} more</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section aria-live="polite" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-base font-black text-slate-900">
          {parseDateKey(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h2>
        {loading ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Loading your schedule...</p>
        ) : selectedSessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">No assigned-course sessions on this day.</p>
        ) : (
          <div className="space-y-3">
            {selectedSessions.map((session) => (
              <article key={session.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-slate-900">{session.course_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{session.course_id}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="h-4 w-4 text-blue-800" />
                    {session.start_time} – {session.end_time}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-slate-400" />{session.cohort_name}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" />{session.notes || 'No location or session notes'}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
