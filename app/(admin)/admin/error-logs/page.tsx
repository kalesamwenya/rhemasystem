'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Bug, ChevronLeft, ChevronRight, Clock3, Download, Printer, RefreshCw, Search, ShieldAlert, X } from 'lucide-react';
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

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
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
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

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
  const downloadCurrentPage = useCallback(() => {
    const header = ['Timestamp', 'Severity', 'Source', 'Request ID', 'Message'];
    const rows = logs.map((log) => [log.timestamp, log.severity, log.source, log.request_id, log.message]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `error-logs-page-${pageNumber}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [logs, pageNumber]);

  useEffect(() => {
    if (!selectedLog) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedLog(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedLog]);

  return (
    <div className="space-y-6">
      <header className="error-log-no-print flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">System monitoring</div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
            <Bug className="h-6 w-6 text-rose-600" /> Error Logs
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Review PHP/API and administrator-browser errors. Logs are access-controlled, rotated automatically, and sensitive values are redacted before display.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={downloadCurrentPage} disabled={!logs.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Download page
          </button>
          <button type="button" onClick={() => window.print()} disabled={!logs.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50">
            <Printer className="h-4 w-4" /> Print page
          </button>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </header>

      <div className="error-log-no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <section aria-label="Filter error logs" className="error-log-no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <div className="error-log-print-area space-y-3">
          <div className="error-log-print-only mb-6 hidden">
            <h1 className="text-xl font-bold">Error Logs</h1>
            <p>Page {pageNumber} · {total.toLocaleString()} matching records · Printed {new Date().toLocaleString()}</p>
          </div>
          {logs.map((log) => (
            <article key={log.id} className="error-log-print-item rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
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
                    <pre className="error-log-print-only mt-2 hidden whitespace-pre-wrap break-words font-mono text-xs leading-5 text-slate-700">{log.message}</pre>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDate(log.timestamp)}</span>
                      {log.request_id && <span className="break-all font-mono">Request: {log.request_id}</span>}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setSelectedLog(log)} className="error-log-no-print shrink-0 self-start text-xs font-bold text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline">
                  View details
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="error-log-no-print flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
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
        {selectedLog && <div className="error-log-no-print fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedLog(null);
        }}>
          <section role="dialog" aria-modal="true" aria-labelledby="error-log-modal-title" className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ring-1 ${severityStyles[selectedLog.severity]}`}>{selectedLog.severity}</span>
                  {selectedLog.source && <code className="break-all text-xs font-bold text-slate-700">{selectedLog.source}</code>}
                </div>
                <h2 id="error-log-modal-title" className="mt-2 text-lg font-black text-slate-900">Error log details</h2>
                <p className="mt-1 text-xs text-slate-500">{formatDate(selectedLog.timestamp)}{selectedLog.request_id ? ` · Request ${selectedLog.request_id}` : ''}</p>
              </div>
              <button type="button" aria-label="Close error log details" onClick={() => setSelectedLog(null)} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-5 w-5" />
              </button>
            </header>
            <pre className="overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-xs leading-5 text-slate-800">{selectedLog.message}</pre>
          </section>
        </div>}
        <style jsx global>{`
          @media print {
            body * { visibility: hidden !important; }
            .error-log-no-print { display: none !important; }
            .error-log-print-area, .error-log-print-area * { visibility: visible !important; }
            .error-log-print-area { position: absolute !important; inset: 0 !important; width: 100% !important; }
            .error-log-print-only { display: block !important; }
            .error-log-print-item { break-inside: avoid; border: 1px solid #cbd5e1 !important; box-shadow: none !important; }
          }
        `}</style>
      </div>
    </div>
  );
}
