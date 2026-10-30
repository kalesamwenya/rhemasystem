'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownWideNarrow, CalendarDays, ChevronLeft, ChevronRight, Code2, Database, Download, Plus, Search, Users } from 'lucide-react';
import { requestRhemaSchedules, syncRhemaSchedules, type RhemaSchedule } from '@/lib/rhema-schedule-api';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-slate-400 focus:bg-white';
const emptyForm = { startDate: '', endDate: '', date: '', start: '09:00', end: '15:00', notes: '', period: 'morning' as const };
const cohortOptions = ['FYM', 'FYE', 'SYM', 'SYE'] as const;
const cohortNumbers: Record<(typeof cohortOptions)[number], number> = { FYM: 1, FYE: 2, SYM: 3, SYE: 4 };

export default function AcademicRegistryPage() {
  const [schedules, setSchedules] = useState<RhemaSchedule[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'course' | 'cohort' | 'sessions' | 'enrollments'>('course');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { requestRhemaSchedules().then((data) => { setSchedules(data.schedules); setEnrollments(data.enrollments); }).catch((error: unknown) => setMessage(error instanceof Error ? error.message : 'Unable to load courses.')); }, []);
  const cohortFilters = useMemo(() => [...new Set(schedules.map((schedule) => schedule.cohortName).filter(Boolean))].sort(), [schedules]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return schedules
      .filter((item) => cohortFilter === 'all' || item.cohortName === cohortFilter)
      .filter((item) => !term || `${item.course} ${item.cohortName} ${item.cohort} ${item.id} ${item.description ?? ''}`.toLowerCase().includes(term))
      .sort((first, second) => {
        const firstValue = sortBy === 'course' ? first.course
          : sortBy === 'cohort' ? first.cohortName
            : sortBy === 'sessions' ? first.sessions.length
              : enrollments[first.id]?.length ?? 0;
        const secondValue = sortBy === 'course' ? second.course
          : sortBy === 'cohort' ? second.cohortName
            : sortBy === 'sessions' ? second.sessions.length
              : enrollments[second.id]?.length ?? 0;
        const comparison = typeof firstValue === 'number' && typeof secondValue === 'number'
          ? firstValue - secondValue
          : String(firstValue).localeCompare(String(secondValue));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [schedules, search, cohortFilter, sortBy, sortDirection, enrollments]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visiblePage = Math.min(page, pageCount);
  const pageSchedules = filtered.slice((visiblePage - 1) * pageSize, visiblePage * pageSize);
  const changeSort = (column: typeof sortBy) => {
    setSortDirection((current) => sortBy === column ? current === 'asc' ? 'desc' : 'asc' : 'asc');
    setSortBy(column);
    setPage(1);
  };
  const sortButton = (label: string, column: typeof sortBy) => (
    <button type="button" onClick={() => changeSort(column)} className="inline-flex items-center gap-1.5 hover:text-slate-900">
      {label}<ArrowDownWideNarrow className={`h-3.5 w-3.5 ${sortBy === column ? 'text-blue-700' : 'text-slate-400'}`} />
      <span className="sr-only">{sortBy === column ? `sorted ${sortDirection === 'asc' ? 'ascending' : 'descending'}` : 'sort'}</span>
    </button>
  );
  const exportPayload = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ schedules }, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'rhema-courses.json'; link.click(); URL.revokeObjectURL(url); };
  return <div className="space-y-6 pb-12">
    <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between"><div><p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Academic registry</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Courses</h1><p className="mt-1 text-sm text-slate-500">Open a course to manage its sessions, cohort, and student roster.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportPayload} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-slate-700"><Download size={14} /> Export</button><button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-[0.12em] text-white"><Plus size={15} /> Create course</button></div></header>
    {message && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">{message}</div>}
    <div className="grid gap-4 sm:grid-cols-3"><Metric icon={<Database size={18} />} label="Courses" value={schedules.length} /><Metric icon={<CalendarDays size={18} />} label="Class sessions" value={schedules.reduce((total, item) => total + item.sessions.length, 0)} /><Metric icon={<Users size={18} />} label="Enrollments" value={Object.values(enrollments).reduce((total, ids) => total + ids.length, 0)} /></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search course code, cohort, or ID" aria-label="Search courses" className={`${inputClass} pl-10`} /></div>
        <select value={cohortFilter} onChange={(event) => { setCohortFilter(event.target.value); setPage(1); }} aria-label="Filter by cohort" className={`${inputClass} md:w-56`}><option value="all">All cohorts</option>{cohortFilters.map((cohort) => <option key={cohort} value={cohort}>{cohort}</option>)}</select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500"><tr>
            <th scope="col" className="px-5 py-3">{sortButton('Course', 'course')}</th>
            <th scope="col" className="px-5 py-3">{sortButton('Cohort', 'cohort')}</th>
            <th scope="col" className="px-5 py-3">{sortButton('Sessions', 'sessions')}</th>
            <th scope="col" className="px-5 py-3">{sortButton('Enrolled students', 'enrollments')}</th>
            <th scope="col" className="px-5 py-3 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {pageSchedules.map((schedule) => <tr key={schedule.id} className="hover:bg-slate-50">
              <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-lg bg-blue-50 p-2 text-blue-800"><Code2 size={17} /></span><span><span className="block font-bold text-slate-900">{schedule.course}</span><span className="mt-0.5 block font-mono text-[10px] text-slate-400">{schedule.id}</span></span></div></td>
              <td className="px-5 py-4 text-slate-600">Cohort {schedule.cohort} · {schedule.cohortName}</td>
              <td className="px-5 py-4 text-slate-600">{schedule.sessions.length}</td>
              <td className="px-5 py-4 text-slate-600">{enrollments[schedule.id]?.length ?? 0}</td>
              <td className="px-5 py-4 text-right"><Link href={`/admin/courses/${encodeURIComponent(schedule.id)}`} className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-blue-800 hover:border-blue-200 hover:bg-blue-50">Open course</Link></td>
            </tr>)}
            {!pageSchedules.length && <tr><td colSpan={5} className="p-10 text-center text-sm font-semibold text-slate-500">No courses match the current search or cohort filter.</td></tr>}
          </tbody>
        </table>
      </div>
      <footer className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-medium text-slate-500">Showing {filtered.length ? (visiblePage - 1) * pageSize + 1 : 0}–{Math.min(visiblePage * pageSize, filtered.length)} of {filtered.length} courses</p>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <label className="flex items-center gap-2 text-xs text-slate-500">Rows<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700"><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label>
          <button type="button" disabled={visiblePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} aria-label="Previous page" className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
          <span className="whitespace-nowrap text-xs font-bold text-slate-500">Page {visiblePage} of {pageCount}</span>
          <button type="button" disabled={visiblePage === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} aria-label="Next page" className="rounded-lg border border-slate-200 p-2 text-slate-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </footer>
    </section>
    {showCreate && <CreateCourse onClose={() => setShowCreate(false)} onSaved={(schedule) => { setSchedules((current) => [...current, schedule]); setShowCreate(false); }} />}
  </div>;
}

function CreateCourse({ onClose, onSaved }: { onClose: () => void; onSaved: (schedule: RhemaSchedule) => void }) {
  const [course, setCourse] = useState('');
  const [description, setDescription] = useState('');
  const [cohort, setCohort] = useState<(typeof cohortOptions)[number] | ''>('');
  const [mode, setMode] = useState<'auto' | 'single'>('auto');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const setField = (field: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const sessions = (): RhemaSchedule['sessions'] => {
    if (mode === 'single') return form.date ? [{
      id: `s_${Date.now()}_0`, date: form.date, start: form.start, end: form.end, notes: form.notes, period: form.period,
    }] : [];
    if (!form.startDate || !form.endDate) return [];
    const result: RhemaSchedule['sessions'] = [];
    const cursor = new Date(`${form.startDate}T00:00:00`);
    const last = new Date(`${form.endDate}T00:00:00`);
    while (cursor <= last) {
      if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
        result.push({
          id: `s_${Date.now()}_${result.length}`,
          date: cursor.toISOString().slice(0, 10),
          start: form.start,
          end: form.end,
          notes: form.notes,
          period: form.period,
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  };
  const save = async () => {
    const generated = sessions();
    if (!course.trim() || !cohort || !generated.length) return setError('Course, cohort, and at least one valid session are required.');
    const schedule = {
      id: `c_${Date.now()}`,
      course: course.toUpperCase(),
      description: description.trim(),
      cohort: cohortNumbers[cohort],
      cohortName: cohort,
      sessions: generated,
    };
    try {
      await syncRhemaSchedules({ schedules: [schedule], enrollments: { [schedule.id]: [] } });
      onSaved(schedule);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this course.');
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Course record</p><h2 className="mt-1 text-2xl font-black text-slate-900">Create course</h2></div>
          <button onClick={onClose} className="text-2xl text-slate-400" aria-label="Close">×</button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Course code"><input value={course} onChange={(event) => setCourse(event.target.value)} className={inputClass} placeholder="TAE" /></Field>
          <Field label="Cohort / class"><select value={cohort} onChange={(event) => setCohort(event.target.value as (typeof cohortOptions)[number] | '')} className={inputClass}><option value="">Select cohort</option>{cohortOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></Field>
        </div>
        <Field label="Course description"><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Course outline, outcomes, and learning details" /></Field>
        <div className="mt-7 flex gap-2">
          <button onClick={() => setMode('auto')} className={`rounded-xl px-4 py-2 text-xs font-black ${mode === 'auto' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'}`}>Auto-generate sessions</button>
          <button onClick={() => setMode('single')} className={`rounded-xl px-4 py-2 text-xs font-black ${mode === 'single' ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600'}`}>Single session</button>
        </div>
        {mode === 'auto' ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Start date"><input type="date" value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} className={inputClass} /></Field>
            <Field label="End date"><input type="date" value={form.endDate} onChange={(event) => setField('endDate', event.target.value)} className={inputClass} /></Field>
          </div>
        ) : <div className="mt-4"><Field label="Session date"><input type="date" value={form.date} onChange={(event) => setField('date', event.target.value)} className={inputClass} /></Field></div>}
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Start time"><input type="time" value={form.start} onChange={(event) => setField('start', event.target.value)} className={inputClass} /></Field>
          <Field label="End time"><input type="time" value={form.end} onChange={(event) => setField('end', event.target.value)} className={inputClass} /></Field>
          <Field label="Session group"><select value={form.period} onChange={(event) => setField('period', event.target.value)} className={inputClass}><option value="morning">Morning</option><option value="evening">Evening</option></select></Field>
        </div>
        <Field label="Notes"><textarea value={form.notes} onChange={(event) => setField('notes', event.target.value)} className={`${inputClass} mt-4 min-h-20`} /></Field>
        {error && <p role="alert" className="mt-3 text-xs font-bold text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600">Cancel</button>
          <button type="button" onClick={() => void save()} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white">Create course</button>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><span className="text-blue-700">{icon}</span></div><p className="mt-4 text-3xl font-black text-slate-900">{value}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-xs font-bold text-slate-600">{label}<span className="mt-1 block">{children}</span></label>; }