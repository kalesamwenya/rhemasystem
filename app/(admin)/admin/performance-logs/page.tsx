'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search } from 'lucide-react';
import { api } from '@/lib/api';

type ActivityStatus = 'all' | 'success' | 'failure';

type ActivityLog = {
  id: number;
  request_id: string;
  actor_role: 'admin' | 'lecturer' | 'student';
  actor_id: string;
  http_method: string;
  request_path: string;
  response_status: number;
  succeeded: number | boolean;
  response_summary: string;
  duration_ms: number;
  created_at: string;
};

type ActivityLogsResponse = {
  success: boolean;
  data: ActivityLog[];
  total: number;
  summary: { total: number; succeeded: number; failed: number };
  limit: number;
  offset: number;
};

const PAGE_SIZE = 50;

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function isSuccessful(log: ActivityLog) {
  return log.succeeded === true || Number(log.succeeded) === 1;
}

export default function PerformanceLogsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus>('all');
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [summary, setSummary] = useState({ total: 0, succeeded: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.activityLogs.list({
        limit: PAGE_SIZE,
        offset,
        status: statusFilter,
        search: search.trim(),
      }) as ActivityLogsResponse;
      if (!response.success || !Array.isArray(response.data) || !response.summary) {
        throw new Error('The activity log response was incomplete.');
      }
      setLogs(response.data);
      setSummary(response.summary);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load activity logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset, search, statusFilter]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(summary.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">System monitoring</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Activity Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Review authenticated API requests, page views, and interface interactions, with outcomes and timing. Form values and request or response bodies are never stored.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Matching requests', value: summary.total, tone: 'bg-slate-100 text-slate-700' },
          { label: 'Successful', value: summary.succeeded, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Failed', value: summary.failed, tone: 'bg-rose-50 text-rose-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${card.tone}`}>{card.label}</span>
            <div className="mt-3 text-2xl font-black text-slate-900">{card.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <section aria-label="Filter activity logs" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 md:w-[420px]">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              maxLength={100}
              className="w-full border-0 bg-transparent text-sm outline-none"
              placeholder="Search route, user, response, or request ID"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {([
              ['all', 'All'],
              ['success', 'Successful'],
              ['failure', 'Failed'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value);
                  setOffset(0);
                }}
                aria-pressed={statusFilter === value}
                className={`rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wider ${statusFilter === value ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 font-bold underline">Retry</button>
        </div>
      )}

      <div className="space-y-3">
        {loading && !logs.length ? (
          <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading activity logs…</p>
        ) : !logs.length ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            {error ? 'Activity logs could not be loaded.' : 'No activity logs match these filters.'}
          </p>
        ) : logs.map((log) => {
          const succeeded = isSuccessful(log);
          return (
            <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`rounded-xl p-2 ${succeeded ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {succeeded ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">{log.http_method}</span>
                      <code className="break-all text-sm font-bold text-slate-900">{log.request_path}</code>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${succeeded ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {succeeded ? 'Success' : 'Failed'} · {log.response_status || 'Network'}
                      </span>
                    </div>
                    <p className="mt-2 break-words text-sm text-slate-700">{log.response_summary || (succeeded ? 'Request completed.' : 'Request failed.')}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{log.actor_role} · {log.actor_id}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDate(log.created_at)}</span>
                      <span>{Number(log.duration_ms).toLocaleString()} ms</span>
                    </div>
                    <p className="mt-2 break-all font-mono text-[10px] text-slate-400">Request ID: {log.request_id}</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${succeeded ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {succeeded ? 'Completed' : 'Error'}
                </span>
              </div>
            </article>
          );
        })}
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
          <Activity className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
