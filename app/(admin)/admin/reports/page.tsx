'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, RefreshCw, Send, Share2 } from 'lucide-react';
import Link from 'next/link';
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

interface ReportDepartment {
  id: string;
  label: string;
  recipient_count: number;
}

function formatDate(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function SharedReportsPage() {
  const [reports, setReports] = useState<SharedReport[]>([]);
  const [departments, setDepartments] = useState<ReportDepartment[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const router = useRouter();

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.adminReports.list() as {
        reports?: SharedReport[];
        departments?: ReportDepartment[];
      };
      if (!Array.isArray(response.reports) || !Array.isArray(response.departments)) {
        throw new Error('The shared reports response was invalid.');
      }
      setReports(response.reports);
      setDepartments(response.departments);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load shared reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const legacyReportId = Number(new URLSearchParams(window.location.search).get('id'));
    if (Number.isInteger(legacyReportId) && legacyReportId > 0) {
      router.replace(`/admin/reports/${legacyReportId}`);
    }
    const initialLoad = window.setTimeout(() => void loadReports(), 0);
    return () => window.clearTimeout(initialLoad);
  }, [loadReports, router]);

  const createReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await api.adminReports.create({ title, content, departments: selectedDepartments }) as {
        report_id?: number;
        notifications_created?: number;
      };
      if (!response.report_id) throw new Error('The report was saved without a report reference.');
      setTitle('');
      setContent('');
      setSelectedDepartments([]);
      setNotice(`Report shared. ${response.notifications_created ?? 0} department notification(s) sent.`);
      router.push(`/admin/reports/${response.report_id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to share this report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#58736b]">Department collaboration</p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Shared reports</h1>
          <p className="mt-2 text-sm text-slate-600">Share a view-only report with one or more departments. Only selected departments and the author can open it.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadReports()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <section className="space-y-3" aria-label="Reports available to your department">
          <h2 className="text-lg font-bold text-slate-900">Reports available to you</h2>
              {loading && reports.length === 0 && <p role="status" className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Loading reports…</p>}
              {!loading && error && reports.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">Reports could not be loaded.</p>}
              {!loading && !error && reports.length === 0 && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No reports have been shared with you yet.</p>}
              {reports.map((report) => (
                <Link
                  key={report.id}
                  href={`/admin/reports/${report.id}`}
                  className="block w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-[#91aaa0]"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <span className="block font-bold text-slate-900">{report.title}</span>
                  <span className="mt-1 block text-xs text-slate-500">By {report.author_name} · {report.author_department} · {formatDate(report.created_at)}</span>
                </span>
                <FileText className="h-5 w-5 shrink-0 text-[#58736b]" />
              </span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                {report.recipients.map((recipient) => <span key={recipient} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{recipient}</span>)}
                {report.is_author && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Created by you</span>}
              </span>
            </Link>
          ))}
        </section>

        <div>
          <form onSubmit={createReport} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-[#31584c]" />
              <h2 className="text-lg font-bold text-slate-900">Share a report</h2>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Report title
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#58736b]" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Report details
              <textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={50000} rows={7} required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#58736b]" />
            </label>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">Share with departments <span className="font-normal text-slate-500">(select one or more)</span></legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {departments.map((department) => (
                  <label key={department.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedDepartments.includes(department.id)}
                      onChange={(event) => setSelectedDepartments((current) => event.target.checked
                        ? [...current, department.id]
                        : current.filter((id) => id !== department.id))}
                      className="accent-[#31584c]"
                    />
                    <span>{department.label}</span>
                    <span className="ml-auto text-xs text-slate-400">{department.recipient_count}</span>
                  </label>
                ))}
                {departments.length === 0 && <p className="text-sm text-slate-500">No active administrator departments can receive reports yet.</p>}
              </div>
            </fieldset>
            <button type="submit" disabled={saving || loading || !selectedDepartments.length} className="inline-flex items-center gap-2 rounded-lg bg-[#173b3a] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#245553] disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-4 w-4" />
              {saving ? 'Sharing…' : 'Share report'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
