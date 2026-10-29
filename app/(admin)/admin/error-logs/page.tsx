'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bug, ChevronLeft, ChevronRight, Clock3, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';

type ErrorSeverity = 'all' | 'error' | 'warning' | 'notice' | 'info';

type ErrorLog = {
  id: string;
  timestamp: string;
  severity: Exclude<ErrorSeverity, 'all'>;
  source: string;
  request_id: string;
  message: string;
};

type ErrorLogsResponse = {
  success: boolean;
  data: ErrorLog[];
  total: number;
  summary: { error: number; warning: number; notice: number; info: number };
};

const PAGE_SIZE = 50;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

const severityStyles: Record<Exclude<ErrorSeverity, 'all'>, string> = {
  error: 'bg-rose-50 text-rose-700 ring-rose-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  notice: 'bg-blue-50 text-blue-700 ring-blue-200',
  info: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function ErrorLogsPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<ErrorSeverity>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [offset, setOffset] = useState(0);
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState({ error: 0, warning: 0, notice: 0, info: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const response = await api.errorLogs.list({
        limit: PAGE_SIZE,
        offset,
        severity,
        search: search.trim(),
        date_from: dateFrom,
        date_to: dateTo,
      }) as ErrorLogsResponse;
      if (!response.success || !Array.isArray(response.data) || !response.summary) {
        throw new Error('The PHP error log response was incomplete.');
      }
      setLogs(response.data);
      setSummary(response.summary);
      setTotal(response.total);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load PHP error logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFrom, dateTo, offset, search, severity]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh, refreshKey]);

  const pageNumber = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">System monitoring</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <Bug className="h-6 w-6 text-rose-600" /> Error Logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Review PHP/API and administrator-browser errors. Logs are access-controlled, rotated automatically, and sensitive values are redacted before display.
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
        {([
          ['Errors', summary.error, 'bg-rose-50 text-rose-700'],
          ['Warnings', summary.warning, 'bg-amber-50 text-amber-800'],
          ['Notices', summary.notice, 'bg-blue-50 text-blue-700'],
          ['Info', summary.info, 'bg-slate-100 text-slate-700'],
        ] as const).map(([label, count, tone]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={`inline-flex rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone}`}>{label}</span>
            <div className="mt-3 text-2xl font-black text-slate-900">{count.toLocaleString()}</div>
          </div>
        ))}
      </div>

      <section aria-label="Filter error logs" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto_auto]">
          <label className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setOffset(0); }}
              maxLength={160}
              className="w-full border-0 bg-transparent text-sm outline-none"
              placeholder="Search message, request ID, or source"
            />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Severity
            <select
              value={severity}
              onChange={(event) => { setSeverity(event.target.value as ErrorSeverity); setOffset(0); }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="all">All levels</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="notice">Notices</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            From
            <input aria-label="Start date" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setOffset(0); }} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            To
            <input aria-label="End date" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setOffset(0); }} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs" />
          </label>
        </div>
      </section>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">{error}</div>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="shrink-0 font-bold underline">Retry</button>
        </div>
      )}

      {loading && !logs.length ? (
        <p role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading PHP error logs…</p>
      ) : !logs.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-semibold text-slate-600">{error ? 'Error logs could not be loaded.' : 'No errors match these filters.'}</p>
          <p className="mt-1 text-xs text-slate-400">New PHP errors are captured after this logging configuration is deployed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <details key={log.id} className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={`mt-0.5 rounded-xl p-2 ${log.severity === 'error' ? 'bg-rose-50 text-rose-700' : log.severity === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                    {log.severity === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${severityStyles[log.severity]}`}>{log.severity}</span>
                      {log.source && <code className="break-all text-xs font-bold text-slate-700">{log.source}</code>}
                    </div>
                    <p className="mt-2 line-clamp-3 break-words font-mono text-xs leading-5 text-slate-700">{log.message}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDate(log.timestamp)}</span>
                      {log.request_id && <span className="break-all font-mono">Request: {log.request_id}</span>}
                    </div>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-slate-500 group-open:text-slate-800">View details</span>
              </summary>
              <div className="border-t border-slate-100 p-4">
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{log.message}</pre>
              </div>
            </details>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{total ? `Showing ${offset + 1}–${Math.min(offset + logs.length, total)} of ${total}` : 'No matching error records'}</span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))} disabled={offset === 0 || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <span className="min-w-20 text-center text-xs font-semibold">Page {pageNumber} of {pageCount}</span>
          <button type="button" onClick={() => setOffset((current) => current + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= total || loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-40">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
