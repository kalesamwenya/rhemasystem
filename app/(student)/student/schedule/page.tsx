'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

type ScheduleEntry = {
  id: string | number;
  course: string;
  session_date: string;
  start_time: string;
  end_time: string;
  notes: string;
};

type UpcomingAssessment = {
  type: 'assignment' | 'quiz' | 'exam';
  id: number;
  name: string;
  course_id: string;
  course_name: string;
  opens_at: number;
  due_at: number;
};

type ScheduleResponse = {
  success?: boolean;
  message?: string;
  data?: { sessions: ScheduleEntry[] };
};

type AssessmentsResponse = {
  success?: boolean;
  message?: string;
  data?: UpcomingAssessment[];
};

type CalendarEvent = {
  key: string;
  date: string;
  title: string;
  course: string;
  type: 'session' | UpcomingAssessment['type'];
  startTime?: string;
  endTime?: string;
  notes?: string;
  timeLabel: string;
};

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const eventStyles: Record<CalendarEvent['type'], string> = {
  session: 'border-blue-200 bg-blue-50 text-blue-900',
  assignment: 'border-amber-200 bg-amber-50 text-amber-900',
  quiz: 'border-violet-200 bg-violet-50 text-violet-900',
  exam: 'border-rose-200 bg-rose-50 text-rose-900',
};
const eventLabels: Record<CalendarEvent['type'], string> = {
  session: 'Class session',
  assignment: 'Assignment',
  quiz: 'Quiz',
  exam: 'Exam',
};

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function timeLabel(value: string): string {
  const parsed = new Date(`2000-01-01T${value}`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function eventDate(assessment: UpcomingAssessment): Date | null {
  const timestamp = assessment.due_at || assessment.opens_at;
  if (!timestamp) return null;
  const date = new Date(timestamp * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function StudentSchedulePage() {
  const [sessions, setSessions] = useState<ScheduleEntry[]>([]);
  const [assessments, setAssessments] = useState<UpcomingAssessment[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const [assessmentError, setAssessmentError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      api.courses.studentSchedule() as Promise<ScheduleResponse>,
      api.courses.studentUpcomingAssessments() as Promise<AssessmentsResponse>,
    ]).then(([sessionResult, assessmentResult]) => {
      if (!active) return;
      if (sessionResult.status === 'fulfilled' && sessionResult.value.success && sessionResult.value.data) {
        setSessions(sessionResult.value.data.sessions ?? []);
      } else {
        setSessionError(sessionResult.status === 'rejected'
          ? sessionResult.reason instanceof Error ? sessionResult.reason.message : 'Unable to load your course sessions.'
          : sessionResult.value.message || 'Unable to load your course sessions.');
      }
      if (assessmentResult.status === 'fulfilled' && assessmentResult.value.success && assessmentResult.value.data) {
        setAssessments(assessmentResult.value.data);
      } else {
        setAssessmentError(assessmentResult.status === 'rejected'
          ? assessmentResult.reason instanceof Error ? assessmentResult.reason.message : 'Unable to load your upcoming activities.'
          : assessmentResult.value.message || 'Unable to load your upcoming activities.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    const sessionEvents: CalendarEvent[] = sessions.map((session) => ({
      key: `session-${session.id}`,
      date: session.session_date.slice(0, 10),
      title: session.course,
      course: session.course,
      type: 'session',
      startTime: session.start_time,
      endTime: session.end_time,
      notes: session.notes,
      timeLabel: `${timeLabel(session.start_time)} – ${timeLabel(session.end_time)}`,
    }));
    const assessmentEvents: CalendarEvent[] = assessments.flatMap((assessment) => {
      const date = eventDate(assessment);
      if (!date) return [];
      return [{
        key: `${assessment.type}-${assessment.id}`,
        date: dateKey(date),
        title: assessment.name,
        course: assessment.course_name,
        type: assessment.type,
        timeLabel: assessment.due_at ? `Due ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Opens',
      }];
    });
    return [...sessionEvents, ...assessmentEvents];
  }, [assessments, sessions]);

  const calendarDates = useMemo(() => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const firstDayOffset = (monthStart.getDay() + 6) % 7;
    return Array.from(
      { length: 42 },
      (_, index) => new Date(monthStart.getFullYear(), monthStart.getMonth(), index - firstDayOffset + 1),
    );
  }, [selectedDate]);
  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      grouped.set(event.date, [...(grouped.get(event.date) ?? []), event]);
    }
    for (const dayEvents of grouped.values()) {
      dayEvents.sort((a, b) => {
        const aTime = a.startTime ?? a.timeLabel;
        const bTime = b.startTime ?? b.timeLabel;
        return aTime.localeCompare(bTime);
      });
    }
    return grouped;
  }, [events]);
  const selectedKey = dateKey(selectedDate);
  const selectedEvents = eventsByDate.get(selectedKey) ?? [];
  const monthLabel = selectedDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const shiftMonth = (offset: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + offset, 1));
  };

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-900">Student schedule</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">Your class sessions, assignments, quizzes, and exams in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => setSelectedDate(new Date())} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">Today</button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </header>

      {(sessionError || assessmentError) && (
        <div role="alert" className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          {sessionError && <p>Sessions: {sessionError}</p>}
          {assessmentError && <p>Activities: {assessmentError}</p>}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
          <h2 className="text-lg font-black text-slate-900">{monthLabel}</h2>
          <CalendarDays className="h-5 w-5 text-blue-900" />
        </div>
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {weekDays.map((day) => <div key={day} className="py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{day}</div>)}
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">Loading your calendar...</div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDates.map((date) => {
              const key = dateKey(date);
              const dayEvents = eventsByDate.get(key) ?? [];
              const inMonth = date.getMonth() === selectedDate.getMonth();
              const isToday = key === dateKey(new Date());
              const isSelected = key === selectedKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                  aria-label={`${date.toLocaleDateString(undefined, { dateStyle: 'full' })}, ${dayEvents.length} activities`}
                  aria-pressed={isSelected}
                  className={`min-h-24 border-b border-r border-slate-100 p-1.5 text-left transition-colors sm:min-h-32 sm:p-2 ${inMonth ? 'bg-white' : 'bg-slate-50/70'} ${isSelected ? 'ring-2 ring-inset ring-blue-800' : 'hover:bg-blue-50/50'}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isToday ? 'bg-blue-900 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span key={event.key} className={`block truncate rounded border px-1 py-0.5 text-[9px] font-bold sm:text-[10px] ${eventStyles[event.type]}`}>
                        <span className="hidden sm:inline">{event.type === 'session' && event.startTime ? `${timeLabel(event.startTime)} ` : ''}</span>{event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && <span className="block truncate px-1 text-[9px] font-bold text-slate-500">+{dayEvents.length - 2} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600">
        {(Object.keys(eventLabels) as CalendarEvent['type'][]).map((type) => (
          <span key={type} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm border ${eventStyles[type]}`} />
            {eventLabels[type]}
          </span>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Selected day</p>
          <h2 className="mt-1 text-lg font-black text-slate-900">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h2>
        </div>
        {selectedEvents.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No sessions or activities scheduled for this day.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {selectedEvents.map((event) => (
              <article key={event.key} className="flex gap-3 py-4">
                <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border ${eventStyles[event.type]}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">{event.title}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${eventStyles[event.type]}`}>{eventLabels[event.type]}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-600">{event.course}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{event.timeLabel}</span>
                    {event.notes && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{event.notes}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
