'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';

type ActivityType = 'all' | 'quiz' | 'exam' | 'assignment';
type ActivityStatus = 'all' | 'in_progress' | 'completed' | 'error';

type StudentActivityLog = {
  id: number;
  student_id: string;
  student_name: string;
  course_id: string;
  course_name: string;
  activity_type: Exclude<ActivityType, 'all'>;
  activity_id: number;
  activity_name: string;
  attempt_number: number;
  status: Exclude<ActivityStatus, 'all'>;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string;
};

type StudentActivityResponse = {
  success: boolean;
  data: StudentActivityLog[];
  total: number;
  summary: { total: number; completed: number; in_progress: number; errors: number };
};

const PAGE_SIZE = 50;

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return 'Not completed';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

const statusStyles: Record<Exclude<ActivityStatus, 'all'>, string> = {
  in_progress: 'bg-amber-50 text-amber-800',
  completed: 'bg-emerald-50 text-emerald-700',
  error: 'bg-rose-50 text-rose-700',
};

export default function StudentActivityLogsPage() {
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState<ActivityType>('all');
  const [status, setStatus] = useState<ActivityStatus>('all');
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<StudentActivityLog[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, in_progress: 0, errors: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.studentActivityLogs.list({
        limit: PAGE_SIZE,
        offset,
        activity_type: activityType,
        status,
        search: search.trim(),
      }) as StudentActivityResponse;
      if (!response.success || !Array.isArray(response.data) || !response.summary) {
        throw new Error('The student activity log response was incomplete.');
      }
      setLogs(response.data);
      setSummary(response.summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load student activity logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activityType, offset, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(summary.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Learning activity</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Student Activity Logs</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Track quiz, exam, and assignment attempts by student and course, including completion time and reported errors.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Matching attempts', value: summary.total, tone: 'bg-slate-100 text-slate-700' },
          { label: 'Completed', value: summary.completed, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'In progress', value: summary.in_progress, tone: 'bg-amber-50 text-amber-800' },
          { label: 'Errors', value: summary.errors, tone: 'bg-rose-50 text-rose-700' },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${item.tone}`}>{item.label}</span>
            <p className="mt-3 text-2xl font-black text-slate-900">{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <section aria-label="Filter student activity logs" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 lg:w-[440px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setOffset(0); }}
              maxLength={100}
              className="w-full border-0 bg-transparent text-sm outline-none"
              placeholder="Search student name or ID, course, activity, or error"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="student-activity-type">Activity type</label>
            <select
              id="student-activity-type"
              value={activityType}
              onChange={(event) => { setActivityType(event.target.value as ActivityType); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="all">All activities</option>
              <option value="quiz">Quizzes</option>
              <option value="exam">Exams</option>
              <option value="assignment">Assignments</option>
            </select>
            <label className="sr-only" htmlFor="student-activity-status">Attempt status</label>
            <select
              id="student-activity-status"
              value={status}
              onChange={(event) => { setStatus(event.target.value as ActivityStatus); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="all">All statuses</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="error">Errors</option>
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1">{error}</p>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 font-bold underline">Retry</button>
        </div>
      )}

      <div className="space-y-3">
        {loading && !logs.length ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading student activity…</p>
        ) : !logs.length ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {error ? 'Student activity could not be loaded.' : 'No activity matches these filters.'}
          </p>
        ) : logs.map((log) => (
          <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`rounded-xl p-2 ${log.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : log.status === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                  {log.status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">{log.student_name}</p>
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-600">{log.student_id}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${statusStyles[log.status]}`}>
                      {log.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{log.activity_name} <span className="font-medium capitalize text-slate-500">· {log.activity_type}</span></p>
                  <p className="mt-1 text-xs text-slate-600">{log.course_name} <span className="text-slate-400">({log.course_id})</span></p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>Attempt {log.attempt_number}</span>
                    <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Started {formatDate(log.started_at)}</span>
                    <span>Duration: {formatDuration(log.duration_seconds)}</span>
                    {log.completed_at && <span>Ended {formatDate(log.completed_at)}</span>}
                  </div>
                  {log.error_message && <p className="mt-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-800"><strong>Error:</strong> {log.error_message}</p>}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{summary.total ? `Showing ${offset + 1}–${Math.min(offset + logs.length, summary.total)} of ${summary.total}` : 'No matching records'}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
            disabled={offset === 0 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="min-w-20 text-center text-xs font-semibold">Page {pageNumber} of {pageCount}</span>
          <button
            type="button"
            onClick={() => setOffset((current) => current + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= summary.total || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
