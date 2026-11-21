'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, Printer, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface SharedReport {
  id: number;
  title: string;
  content: string;
  author_name: string;
  author_department: string;
  created_at: string;
  recipients: string[];
  is_author: boolean;
}

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function SharedReportPage({ reportId }: { reportId: number }) {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfBusy, setPdfBusy] = useState<'view' | 'download' | null>(null);

  const openReportPdf = async (mode: 'view' | 'download') => {
    setPdfBusy(mode);
    setError('');
    try {
      const pdf = await api.adminReports.pdf(reportId, mode === 'view' ? 'inline' : 'attachment');
      const url = URL.createObjectURL(pdf);
      if (mode === 'view') {
        const preview = window.open(url, '_blank');
        if (!preview) {
          URL.revokeObjectURL(url);
          throw new Error('Allow pop-ups to open the report PDF.');
        }
        window.setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = `Emit-Academy-Report-${reportId}.pdf`;
        document.body.appendChild(link);
        try { link.click(); } finally { link.remove(); }
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to open the report PDF.');
    } finally {
      setPdfBusy(null);
    }
  };

  const loadReport = useCallback(async () => {
    if (!Number.isSafeInteger(reportId) || reportId < 1) {
      setReport(null);
      setError('This report link is invalid.');
      setLoading(false);
      return;
    }
    setReport(null);
    setLoading(true);
    setError('');
    try {
      const response = await api.adminReports.view(reportId) as { report?: SharedReport };
      if (!response.report) throw new Error('This report is unavailable or you do not have permission to view it.');
      setReport(response.report);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load this report.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadReport(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadReport]);

  return (
    <main className="mx-auto max-w-4xl space-y-5 pb-10">
      <Link href="/admin/reports" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
        <ArrowLeft className="h-4 w-4" /> All shared reports
      </Link>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => void loadReport()} disabled={loading} className="mt-3 inline-flex items-center gap-2 font-semibold hover:underline disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Try again
          </button>
        </div>
      )}

      {loading && !report && <p role="status" className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Loading report…</p>}

      {report && (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-emerald-50 p-3 text-[#31584c]"><FileText className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#58736b]">Shared report</p>
              <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{report.title}</h1>
              <p className="mt-2 text-sm text-slate-600">Prepared by {report.author_name} · {report.author_department} · {formatDate(report.created_at)}</p>
            </div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h2 className="text-sm font-bold text-slate-800">Report details</h2>
            <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{report.content}</div>
          </div>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Shared with</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.recipients.map((recipient) => <span key={recipient} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{recipient}</span>)}
              {report.is_author && <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Created by you</span>}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button type="button" disabled={pdfBusy !== null} onClick={() => void openReportPdf('view')} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50">
              <Printer className="h-4 w-4" /> Open / print PDF
            </button>
            <button type="button" disabled={pdfBusy !== null} onClick={() => void openReportPdf('download')} className="inline-flex items-center gap-2 rounded-lg bg-[#003da5] px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>
        </article>
      )}
    </main>
  );
}
