'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

type ServiceRecord = {
  id: number;
  cohort: string;
  term_id: number;
  stamp_date: string;
  service_date: string | null;
  hours: number;
  ministry: string;
  supervisor: string;
  comments: string | null;
  created_at: string;
};

type TermProgress = {
  student_id: string;
  name: string;
  cohort: string;
  term_id: number;
  start_date: string | null;
  end_date: string | null;
  completed_hours: number;
  required_hours: number;
  remaining_hours: number;
  status: 'completed' | 'overdue' | 'upcoming' | 'in_progress';
};

type ServiceHoursResponse = {
  data: ServiceRecord[];
  total_hours: number;
  term_progress: TermProgress[];
};

const dateLabel = (value: string | null) => (
  value ? new Date(`${value}T12:00:00`).toLocaleDateString() : 'Not set'
);

const statusLabels: Record<TermProgress['status'], string> = {
  completed: 'Requirement met',
  overdue: 'Follow-up required',
  upcoming: 'Upcoming',
  in_progress: 'In progress',
};

export default function StudentServiceHoursPage() {
  const [report, setReport] = useState<ServiceHoursResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');

  useEffect(() => {
    let active = true;
    (api.serviceHours.myHours() as Promise<ServiceHoursResponse>)
      .then((response) => {
        if (active) setReport(response);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your service-hour record.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const visibleRecords = useMemo(
    () => (report?.data ?? []).filter((record) => selectedTerm === 'all' || String(record.term_id) === selectedTerm),
    [report, selectedTerm],
  );

  return (
    <main className="space-y-6 pb-10">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Student affairs</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">My church service hours</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Review the ministry hours recorded against your student account and your required hours for each term.
          The target is 20 hours multiplied by the term number.
        </p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your linked service record…
        </div>
      ) : report ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Recorded hours</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{Number(report.total_hours).toFixed(2)}</p>
              <p className="mt-1 text-sm text-slate-500">Total hours linked to your student account</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="text-xs font-black uppercase tracking-wider text-blue-800">Service-hour policy</p>
              <p className="mt-2 text-lg font-black text-blue-950">20 × term number</p>
              <p className="mt-1 text-sm text-blue-900">For example, Term 2 requires 40 hours.</p>
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">Term requirements</h2>
              <p className="mt-1 text-sm text-slate-500">Hours are totaled separately for each academic term.</p>
            </div>
            {report.term_progress.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
                No academic terms have been configured yet.
              </div>
            ) : report.term_progress.map((term) => {
              const progressPercent = term.required_hours > 0
                ? Math.min(100, (term.completed_hours / term.required_hours) * 100)
                : 100;
              const complete = term.status === 'completed';
              const overdue = term.status === 'overdue';
              return (
                <article key={term.term_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black text-slate-900">Term {term.term_id}</h3>
                      <p className="mt-1 text-xs text-slate-500">{dateLabel(term.start_date)} – {dateLabel(term.end_date)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      complete ? 'bg-emerald-100 text-emerald-800'
                        : overdue ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                    }`}>
                      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : overdue ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                      {statusLabels[term.status]}
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-bold text-slate-700">{term.completed_hours.toFixed(2)} / {term.required_hours} hours</span>
                    {term.remaining_hours > 0 && <span className="text-slate-500">{term.remaining_hours.toFixed(2)} hours remaining</span>}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${complete ? 'bg-emerald-500' : overdue ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${progressPercent}%` }} />
                  </div>
                </article>
              );
            })}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">Service history</h2>
                <p className="mt-1 text-sm text-slate-500">These entries are stored with your student ID.</p>
              </div>
              <label className="text-xs font-bold text-slate-600">
                Filter by term
                <select value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value)} className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="all">All terms</option>
                  {report.term_progress.map((term) => <option key={term.term_id} value={term.term_id}>Term {term.term_id}</option>)}
                </select>
              </label>
            </div>
            {visibleRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
                No service-hour entries are recorded for this selection yet.
              </div>
            ) : (
              <div className="space-y-3">
                {visibleRecords.map((record) => (
                  <article key={record.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{record.ministry}</h3>
                        <p className="mt-1 text-sm text-slate-600">Term {record.term_id} · {record.cohort}</p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-800">{Number(record.hours).toFixed(2)} hours</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      <span>Service date: {dateLabel(record.service_date)}</span>
                      <span>Verified: {dateLabel(record.stamp_date)}</span>
                      {record.supervisor && <span>Supervisor: {record.supervisor}</span>}
                    </div>
                    {record.comments && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{record.comments}</p>}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
