'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock3, Loader2, Printer, QrCode, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

type SlipSession = {
  session_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  course_name: string;
  cohort_name: string;
  has_required_audio: number | boolean;
};

type ViolationRecord = {
  id: number;
  student_id: string;
  student_name: string;
  cohort_name: string;
  term_id: number;
  details: string;
  incident_date: string;
  incident_time: string;
  email: string;
  acknowledgement_name: string;
  administration_signoff: string;
  submitted_at: string;
  violation_count: number;
  flagged: number | boolean;
};

type LateSlipRecord = {
  id: number;
  student_id: string;
  student_name: string;
  email: string;
  schedule_id: string;
  cohort_name: string;
  reasons: string;
  audio_acknowledgement: string;
  administration_authorization: string;
  late_seconds: number;
  submitted_at: string;
  audio_title: string | null;
  audio_status: string;
  course_name: string;
  session_date: string;
  start_time: string;
};

type ManagementResponse = {
  data?: {
    sessions: SlipSession[];
    violations: ViolationRecord[];
    late_slips: LateSlipRecord[];
    audio_tables_available: boolean;
  };
};

function QrCard({ value, label }: { value: string; label: string }) {
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    import('@zxing/browser')
      .then(({ BrowserQRCodeSvgWriter }) => {
        const svg = new BrowserQRCodeSvgWriter().write(value, 192, 192);
        const source = new XMLSerializer().serializeToString(svg);
        if (active) setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`);
      })
      .catch(() => { if (active) setError('Unable to create QR code.'); });
    return () => { active = false; };
  }, [value]);

  return (
    <article className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center print:break-inside-avoid">
      <p className="min-h-10 text-sm font-black leading-5 text-slate-900">{label}</p>
      {qr ? <Image src={qr} alt={`QR code for ${label}`} width={160} height={160} unoptimized className="mt-2 h-40 w-40" /> : <div className="mt-2 flex h-40 w-40 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500">{error || 'Generating QR…'}</div>}
      <a href={value} target="_blank" rel="noreferrer" className="mt-2 break-all text-xs font-semibold text-blue-800 underline print:hidden">Open form</a>
    </article>
  );
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateTime(value: string) {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function StudentAffairsSlipsPage() {
  const [data, setData] = useState<ManagementResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [appliedStudentFilter, setAppliedStudentFilter] = useState('');

  const load = useCallback(async (studentId = '', refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.attendance.manageStudentSlips(studentId ? { student_id: studentId } : {}) as ManagementResponse;
      if (!response.data) throw new Error('The slip-management response was incomplete.');
      setData(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load QR codes and slip records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(''); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submitStudentSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const studentId = studentFilter.trim();
    setAppliedStudentFilter(studentId);
    void load(studentId, true);
  };

  const baseUrl = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <main className="space-y-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/student-affairs" className="mb-3 inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-700 print:hidden"><ArrowLeft className="h-4 w-4" />Student Affairs dashboard</Link>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-600">Student Affairs · QR slips</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Code violations & late slips</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Print the general slip QR codes. Students choose their academic term or currently running class session in the form. Review student records and term flags below.</p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800"><Printer className="h-4 w-4" />Print QR codes</button>
          <button type="button" onClick={() => void load(appliedStudentFilter, true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div>}
      {data && !data.audio_tables_available && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950 print:hidden">Audio purchase integration is not configured. Late slips can be tracked, but the required-audio purchase and notifications need the audio database extension.</div>}
      <form onSubmit={submitStudentSearch} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row print:hidden">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-slate-500">
          <Search className="h-4 w-4 shrink-0" />
          <input value={studentFilter} onChange={(event) => setStudentFilter(event.target.value)} maxLength={50} placeholder="Student number — search the complete history" aria-label="Search student slip history by student number" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
        </label>
        <button type="submit" disabled={refreshing} className="rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-950 disabled:opacity-60">Search all history</button>
        {appliedStudentFilter && <button type="button" onClick={() => { setStudentFilter(''); setAppliedStudentFilter(''); void load(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Clear</button>}
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <div className="rounded-xl bg-red-50 p-2.5 text-red-800"><QrCode className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-black text-slate-900">QR codes to display or print</h2>
            <p className="mt-1 text-sm text-slate-500">The late-slip QR opens a shared form. Students verify their number and choose a session currently in progress for one of their active enrollments.</p>
          </div>
        </div>
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading session QR codes…</div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-3">
            <QrCard value={`${baseUrl}/slips/code-violation`} label="General code-violation slip" />
            <QrCard value={`${baseUrl}/slips/late-slip`} label="General late-slip form — students choose their current session" />
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-amber-50 p-2.5 text-amber-900"><ShieldCheck className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-black text-slate-900">Code violation history</h2><p className="mt-1 text-sm text-slate-500">A student is flagged when their term total exceeds three.</p></div>
        </div>
        {data && <p className="mb-3 text-xs font-medium text-slate-500">{appliedStudentFilter ? `Complete history for student ${appliedStudentFilter}` : 'Showing up to 500 latest records. Search a student number to load their complete history.'}</p>}
        {loading ? <p className="py-6 text-sm text-slate-500">Loading violation history…</p> : !data?.violations.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No code violations have been submitted.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="p-3">Student</th><th className="p-3">Term</th><th className="p-3">Incident</th><th className="p-3">Total</th><th className="p-3">Status</th><th className="p-3">Submitted</th></tr></thead>
              <tbody>{data.violations.map((row) => {
                const flagged = Boolean(Number(row.flagged));
                return <tr key={row.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="p-3"><p className="font-bold text-slate-900">{row.student_name}</p><p className="text-xs text-slate-500">{row.student_id} · {row.cohort_name}</p></td>
                  <td className="p-3">Term {row.term_id}</td>
                  <td className="max-w-sm p-3 text-slate-700">
                    <p className="whitespace-pre-wrap">{row.details}</p>
                    <p className="mt-1 text-xs text-slate-500">Incident: {row.incident_date} · {String(row.incident_time).slice(0, 5)}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.email}{row.acknowledgement_name ? ` · Acknowledged by ${row.acknowledgement_name}` : ''}{row.administration_signoff ? ` · Signed by ${row.administration_signoff}` : ''}</p>
                  </td>
                  <td className="p-3 font-bold">{row.violation_count}</td>
                  <td className="p-3">{flagged ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-950"><AlertTriangle className="h-3.5 w-3.5" />Flagged</span> : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-3.5 w-3.5" />On record</span>}</td>
                  <td className="whitespace-nowrap p-3 text-xs text-slate-500">{formatDateTime(row.submitted_at)}</td>
                </tr>;
              })}</tbody>
            </table>
            {data.violations.length === 500 && <p className="mt-3 text-xs text-slate-500">Showing the 500 most recent violation records.</p>}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 print:hidden">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-sky-50 p-2.5 text-sky-900"><Clock3 className="h-5 w-5" /></div>
          <div><h2 className="text-xl font-black text-slate-900">Late slip history</h2><p className="mt-1 text-sm text-slate-500">Lateness is calculated from the scheduled class start and server time.</p></div>
        </div>
        {data && <p className="mb-3 text-xs font-medium text-slate-500">{appliedStudentFilter ? `Complete history for student ${appliedStudentFilter}` : 'Showing up to 500 latest records. Search a student number to load their complete history.'}</p>}
        {loading ? <p className="py-6 text-sm text-slate-500">Loading late slips…</p> : !data?.late_slips.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">No late slips have been submitted.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500"><th className="p-3">Student</th><th className="p-3">Class</th><th className="p-3">Lateness</th><th className="p-3">Required audio</th><th className="p-3">Submitted</th></tr></thead>
              <tbody>{data.late_slips.map((row) => <tr key={row.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="p-3"><p className="font-bold text-slate-900">{row.student_name}</p><p className="text-xs text-slate-500">{row.student_id} · {row.email}</p></td>
                <td className="p-3"><p className="font-semibold text-slate-800">{row.course_name}</p><p className="text-xs text-slate-500">{row.cohort_name} · {formatDate(row.session_date)} · {row.start_time}</p><p className="mt-1 max-w-sm whitespace-pre-wrap text-xs text-slate-600">Reason: {row.reasons}</p><p className="mt-1 text-xs text-slate-500">Audio acknowledgement: {row.audio_acknowledgement.toUpperCase()}{row.administration_authorization ? ` · Authorized by ${row.administration_authorization}` : ''}</p></td>
                <td className="whitespace-nowrap p-3 font-bold">{Math.ceil(Number(row.late_seconds) / 60)} min</td>
                <td className="p-3"><p className="font-semibold text-slate-800">{row.audio_title || '—'}</p><span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold ${row.audio_status === 'Purchase required' || row.audio_status === 'Audio not configured' ? 'bg-amber-100 text-amber-950' : 'bg-emerald-50 text-emerald-800'}`}>{row.audio_status}</span></td>
                <td className="whitespace-nowrap p-3 text-xs text-slate-500">{formatDateTime(row.submitted_at)}</td>
              </tr>)}</tbody>
            </table>
            {data.late_slips.length === 500 && <p className="mt-3 text-xs text-slate-500">Showing the 500 most recent late slips.</p>}
          </div>
        )}
      </section>
    </main>
  );
}
